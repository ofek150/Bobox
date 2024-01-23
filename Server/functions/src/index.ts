import { initializeApp } from "firebase-admin/app";
import { registerWithEmailAndPassword, onUserCreated } from "./authentication";
import { initiateSmallFileUpload, completeSmallFileUpload, initiateMultipartUpload, generateUploadPartURL, completeMultipartUpload, abortMultipartUpload, generatePublicDownloadLink, deleteFile } from "./r2";
import { getFileDownloadInfo, getAllFilesOfUser, generatePrivateDownloadLink, getPrivateDownloadId, renameFile, createFolder } from "./db"
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
    generatePublicDownloadLink,
    getFileDownloadInfo,
    getAllFilesOfUser,
    generatePrivateDownloadLink,
    getPrivateDownloadId,
    renameFile,
    deleteFile, 
    createFolder
};
