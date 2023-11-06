import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const signInWithGoogle = functions.https.onCall(async (data, context) => {
    try {
        const userRecord = await admin.auth().getUser(data.uid);
        const db = admin.firestore();
        const docRef = db.collection('users').doc(data.uid);
        const docSnap = await docRef.get();
        if (!docSnap.exists) {
            await docRef.set({
                uid: userRecord.uid,
                name: userRecord.displayName,
                authProvider: 'google',
                email: userRecord.email,
            });
        }
        return { message: 'Sign in with Google successful' };
    } catch (error) {
        // console.error('Error signing in with Google:', error);
        throw new functions.https.HttpsError('internal', 'An error occurred while signing in with Google.');
    }
});

interface RegistrationData {
    name: string;
    email: string;
    password: string;
    agreeMailPromotions: boolean;
}

const isValidEmail = (email: string): boolean => {
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return EMAIL_REGEX.test(email);
};

const isValidName = (name: string): boolean => {
    const NAME_REGEX = /^[A-Za-z\s]{2,}$/;
    return NAME_REGEX.test(name);
};

const isValidPassword = (password: string): boolean => {
    const PASSWORD_REGEX = /^(?=.{8,4096})(?:(?=(?:[^[A-Z]*[A-Z]){1,})|(?=(?:[^[a-z]*[a-z]){1,})|(?=(?:[^[\d]*\d){1,})|(?=(?:[^[\W_]*[\W_]){1,})){2,}\S{8,4096}$/
    return PASSWORD_REGEX.test(password);
};

export const registerWithEmailAndPassword = functions.https.onCall(async (data: RegistrationData, context) => {
    try {

        const { name, email, password, agreeMailPromotions } = data;

        if (!isValidEmail(email)) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid email format. Please provide a valid email address.');
        }

        if (!isValidName(name)) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid name format. Name must contain at least 2 characters and consist of letters and spaces only.');
        }

        if (!isValidPassword(password)) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid password format. Password must have at least 8 characters and include at least two of the following: uppercase letter, lowercase letter, number, or special character.');
        }

        if (agreeMailPromotions === undefined) {
            throw new functions.https.HttpsError('invalid-argument', 'Please agree to receive mail promotions.');
        }

        // Use admin SDK to check if the user already exists
        try {
            await admin.auth().getUserByEmail(email);
            throw new functions.https.HttpsError('already-exists', 'A user with this email address already exists.');
        } catch (getUserError: any) {
            if (getUserError && getUserError.code === 'auth/user-not-found') {
                // Continue registration if the user does not exist
                // Use admin SDK to create user
                const userRecord = await admin.auth().createUser({
                    email: email,
                    password: password,
                    displayName: name,
                });

                // Then create user document
                const db = admin.firestore();
                await db.collection('users').doc(userRecord.uid).set({
                    uid: userRecord.uid,
                    name: data.name,
                    authProvider: 'local',
                    email: data.email,
                    agreeMailToPromotions: agreeMailPromotions
                });

                return { message: 'User registered successfully' };
            } else {
                console.error(getUserError);
                throw new functions.https.HttpsError('internal', 'Failed to check user existence');
            }
        }
    } catch (error: any) {
        if (error & error.code && error.code.startsWith('auth/')) {
            throw new functions.https.HttpsError('invalid-argument', error.message);
        }
        console.log("Error in user registration: ", error.message);
        throw new functions.https.HttpsError('internal', 'Failed to register user');
    }
});
