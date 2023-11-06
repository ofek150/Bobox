import { initializeApp } from "firebase-admin/app";
import { registerWithEmailAndPassword, signInWithGoogle } from './authentication';

initializeApp();

export {
    registerWithEmailAndPassword,
    signInWithGoogle
};
