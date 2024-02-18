import { initializeApp } from "firebase-admin/app";
import { registerWithEmailAndPassword, onUserCreated } from "./authentication.js";
import { initiateSmallFileUpload, completeSmallFileUpload, initiateMultipartUpload, generateUploadPartURL, completeMultipartUpload, abortMultipartUpload, generatePublicDownloadLink } from "./r2.js";
import { getFileDownloadInfo, renameFile, createFolder, moveFileToFolder, renameFolder, shareFileWithUserByEmail, acceptFileShareInvitation, shareFolderWithUserByEmail, acceptFolderShareInvitation, deleteFile, deleteFolder } from "./db.js"

const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

console.log(`Firebase App ID: ${process.env.FIREBASE_APP_ID}`);
// Initialize Firebase
initializeApp(firebaseConfig);

export {
    registerWithEmailAndPassword,
    onUserCreated,
    initiateSmallFileUpload,
    completeSmallFileUpload,
    initiateMultipartUpload,
    generateUploadPartURL,
    completeMultipartUpload,
    abortMultipartUpload,
    generatePublicDownloadLink,
    getFileDownloadInfo,
    renameFile,
    deleteFile,
    deleteFolder,
    createFolder,
    moveFileToFolder,
    renameFolder,
    shareFileWithUserByEmail,
    acceptFileShareInvitation,
    shareFolderWithUserByEmail,
    acceptFolderShareInvitation
};
