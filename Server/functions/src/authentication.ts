import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { CallableRequest, HttpsError, onCall } from 'firebase-functions/v2/https';
import { isValidEmail, isValidName, isValidPassword } from './utils/helpers.js';
import { DEFAULT_MAX_TOTAL_FILE_SIZE } from './utils/constants.js';
import { internal, requireAuth, requireFields } from './utils/guards.js';

const createRootFolder = async (userId: string) => {
    const db = getFirestore();
    const docRef = db.collection('users').doc(userId);
    const folderRef = docRef.collection('folders').doc('root');
    await folderRef.set({
        isRootFolder: true,
        parentFolderId: "",
        folderName: "root",
        files: [],
        folders: [],
        collaborators: {},
        shared: false,
        ownerUid: userId
    });
}

/** True when the user's root folder document exists. */
const hasRootFolder = async (userId: string) => {
    const snap = await getFirestore().collection('users').doc(userId).collection('folders').doc('root').get();
    return snap.exists;
}

const createUserDoc = async (uid: string, name: string | null | undefined, email: string | null | undefined, authProvider: string, agreeMailPromotions: boolean) => {
    await getFirestore().collection('users').doc(uid).set({
        uid: uid,
        name: name,
        authProvider: authProvider,
        email: email,
        agreeMailToPromotions: agreeMailPromotions,
        totalFileSize: 0,
        maxTotalFileSize: DEFAULT_MAX_TOTAL_FILE_SIZE
    });
}

// v2 equivalent of the old v1 auth trigger (onUserCreated): the client calls
// this right after a Google sign-in. Idempotent AND self-healing: if a past
// attempt created the user doc but failed before the root folder (half-init),
// a repeat call repairs it.
export const completeGoogleSignUp = onCall({ cors: true }, async (request: CallableRequest<void>) => {
    const uid = requireAuth(request.auth);
    try {
        const docRef = getFirestore().collection('users').doc(uid);
        const docSnap = await docRef.get();
        let initialized = false;

        if (!docSnap.exists) {
            const userRecord = await getAuth().getUser(uid);
            await createUserDoc(uid, userRecord.displayName, userRecord.email, 'google', false);
            initialized = true;
        }

        if (!(await hasRootFolder(uid))) {
            await createRootFolder(uid);
        }
        return { initialized };
    } catch (error) {
        throw internal('completeGoogleSignUp', error);
    }
});


interface RegistrationData {
    name: string;
    email: string;
    password: string;
    agreeMailPromotions: boolean;
}

export const registerWithEmailAndPassword = onCall({ cors: true }, async (request: CallableRequest<RegistrationData>) => {
    try {
        const { name, email, password, agreeMailPromotions } = requireFields(request.data, ['name', 'email', 'password']);
        if (typeof agreeMailPromotions !== 'boolean') {
            throw new HttpsError('invalid-argument', 'Please agree to receive mail promotions.');
        }

        if (!isValidEmail(email)) {
            throw new HttpsError('invalid-argument', 'Invalid email format. Please provide a valid email address.');
        }

        if (!isValidName(name)) {
            throw new HttpsError('invalid-argument', 'Invalid name format. Name must contain at least 2 characters and consist of letters and spaces only.');
        }

        if (!isValidPassword(password)) {
            throw new HttpsError('invalid-argument', 'Invalid password format. Password must have at least 8 characters and include at least two of the following: uppercase letter, lowercase letter, number, or special character.');
        }

        // Use admin SDK to check if the user already exists
        let existing: boolean;
        try {
            await getAuth().getUserByEmail(email);
            existing = true;
        } catch (getUserError: any) {
            if (getUserError?.code === 'auth/user-not-found' || getUserError?.code === 'auth/invalid-email') {
                existing = false;
            } else {
                console.error(getUserError);
                throw new HttpsError('internal', 'Failed to check user existence');
            }
        }
        if (existing) {
            throw new HttpsError('already-exists', 'A user with this email address already exists.');
        }

        // Use admin SDK to create user, then the Firestore mirror doc.
        const userRecord = await getAuth().createUser({
            email: email,
            password: password,
            displayName: name,
        });

        try {
            await createUserDoc(userRecord.uid, name, email, 'local', agreeMailPromotions);
            await createRootFolder(userRecord.uid);
        } catch (error) {
            // Registration can't work without its document: undo the auth user.
            console.error('Rolling back auth user after Firestore init failure:', error);
            await getAuth().deleteUser(userRecord.uid).catch(() => null);
            throw new HttpsError('internal', 'Failed to finish registration. Please try again.');
        }

        return { success: true };
    } catch (error) {
        throw internal('registerWithEmailAndPassword', error);
    }
});
