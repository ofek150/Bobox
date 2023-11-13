import { initializeApp } from "firebase-admin/app";
import { registerWithEmailAndPassword, onUserCreated } from "./authentication";
import { generateUploadFileURL } from "./r2";

initializeApp();

export { registerWithEmailAndPassword, onUserCreated, generateUploadFileURL };
