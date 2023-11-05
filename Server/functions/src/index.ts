import * as admin from 'firebase-admin';
import { registerWithEmailAndPassword, signInWithGoogle } from './authentication';

admin.initializeApp();

export {
    registerWithEmailAndPassword,
    signInWithGoogle
};
