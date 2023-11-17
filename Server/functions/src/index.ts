import { initializeApp } from "firebase-admin/app";
import { registerWithEmailAndPassword, onUserCreated } from "./authentication";
import { generateUploadFileURL, initiateMultipartUpload, generateUploadPartURL, completeMultipartUpload, AbortMultipartUpload, } from "./r2";

initializeApp();

export {
    registerWithEmailAndPassword,
    onUserCreated,
    generateUploadFileURL,
    initiateMultipartUpload,
    generateUploadPartURL,
    completeMultipartUpload,
    AbortMultipartUpload
};
