import { initializeApp } from "firebase-admin/app";
import { registerWithEmailAndPassword, onUserCreated } from "./authentication";
import { uploadFile } from "./r2";

initializeApp();

export { registerWithEmailAndPassword, onUserCreated, uploadFile };
