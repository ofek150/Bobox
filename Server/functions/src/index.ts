import { initializeApp } from "firebase-admin/app";
import { registerWithEmailAndPassword, onUserCreated } from "./authentication.js";
import { initiateSmallFileUpload, completeSmallFileUpload, initiateMultipartUpload, generateUploadPartURL, completeMultipartUpload, abortMultipartUpload, generatePublicDownloadLink } from "./r2.js";
import { getFileDownloadInfo, renameFile, createFolder, moveFileToFolder, renameFolder, shareFileWithUserByEmail, acceptFileShareInvitation, shareFolderWithUserByEmail, acceptFolderShareInvitation, deleteFile, deleteFolder } from "./db.js"
import 'dotenv/config'

const firebaseConfig = {
    apiKey: process.env._FIREBASE_API_KEY,
    authDomain: process.env._FIREBASE_AUTH_DOMAIN,
    projectId: process.env._FIREBASE_PROJECT_ID,
    storageBucket: process.env._FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env._FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env._FIREBASE_APP_ID,
    measurementId: process.env._FIREBASE_MEASUREMENT_ID
};
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
