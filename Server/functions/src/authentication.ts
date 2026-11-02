import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { CallableRequest, HttpsError, onCall } from 'firebase-functions/v2/https';
import { isValidEmail, isValidName, isValidPassword } from './utils/helpers.js';
import { DEFAULT_MAX_TOTAL_FILE_SIZE } from './utils/constants.js';

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

// v2 equivalent of the old v1 auth trigger (onUserCreated): the client calls
// this right after a Google sign-in. Idempotent - it only initializes when
// the user document is missing, so repeat calls are harmless.
export const completeGoogleSignUp = onCall({ cors: true }, async (request: CallableRequest<void>) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    const uid = request.auth.uid;
    try {
        const db = getFirestore();
        const docRef = db.collection('users').doc(uid);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            const userRecord = await getAuth().getUser(uid);
            // Create the user document
            await docRef.set({
                uid: uid,
                name: userRecord.displayName,
                authProvider: 'google',
                email: userRecord.email,
                agreeMailToPromotions: false,
                totalFileSize: 0,
                maxTotalFileSize: DEFAULT_MAX_TOTAL_FILE_SIZE
            });
            await createRootFolder(uid);
        }
        return { initialized: !docSnap.exists };
    } catch (error) {
        throw new HttpsError('internal', 'An error occurred while signing in with Google.');
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
        const data = request.data;
        const { name, email, password, agreeMailPromotions } = data;

        if (!isValidEmail(email)) {
            throw new HttpsError('invalid-argument', 'Invalid email format. Please provide a valid email address.');
        }

        if (!isValidName(name)) {
            throw new HttpsError('invalid-argument', 'Invalid name format. Name must contain at least 2 characters and consist of letters and spaces only.');
        }

        if (!isValidPassword(password)) {
            throw new HttpsError('invalid-argument', 'Invalid password format. Password must have at least 8 characters and include at least two of the following: uppercase letter, lowercase letter, number, or special character.');
        }

        if (agreeMailPromotions === undefined) {
            throw new HttpsError('invalid-argument', 'Please agree to receive mail promotions.');
        }

        // Use admin SDK to check if the user already exists
        try {
            await getAuth().getUserByEmail(email);
            throw new HttpsError('already-exists', 'A user with this email address already exists.');
        } catch (getUserError: any) {
            if (getUserError && getUserError.code === 'auth/user-not-found') {
                // Continue registration if the user does not exist
                // Use admin SDK to create user
                const userRecord = await getAuth().createUser({
                    email: email,
                    password: password,
                    displayName: name,
                });

                // Then create user document
                const db = getFirestore();
                await db.collection('users').doc(userRecord.uid).set({
                    uid: userRecord.uid,
                    name: data.name,
                    authProvider: 'local',
                    email: data.email,
                    agreeMailToPromotions: agreeMailPromotions,
                    totalFileSize: 0,
                    maxTotalFileSize: DEFAULT_MAX_TOTAL_FILE_SIZE
                });

                await createRootFolder(userRecord.uid);

                return { success: true };
            } else {
                console.error(getUserError);
                throw new HttpsError('internal', 'Failed to check user existence');
            }
        }
    } catch (error: any) {
        console.error('Error in user registration:', error.message);
        throw new HttpsError('internal', 'Failed to register user', { message: error.message });
    }
});