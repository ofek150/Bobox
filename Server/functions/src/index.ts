import { initializeApp } from "firebase-admin/app";
import { registerWithEmailAndPassword, onUserCreated } from './authentication';

initializeApp();

export {
    registerWithEmailAndPassword,
    onUserCreated
};
