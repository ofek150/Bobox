import { initializeApp } from "firebase-admin/app";
import { registerWithEmailAndPassword, onUserCreated } from "./authentication";
import { initiateSmallFileUpload, completeSmallFileUpload, initiateMultipartUpload, generateUploadPartURL, completeMultipartUpload, abortMultipartUpload, generateDownloadLink } from "./r2";
import { getFileDownloadInfo } from "./db"
initializeApp();

export {
    registerWithEmailAndPassword,
    onUserCreated,
    initiateSmallFileUpload,
    completeSmallFileUpload,
    initiateMultipartUpload,
    generateUploadPartURL,
    completeMultipartUpload,
    abortMultipartUpload,
    generateDownloadLink,
    getFileDownloadInfo,
};
