import { initializeApp } from "firebase-admin/app";
import { registerWithEmailAndPassword, onUserCreated } from "./authentication.js";
import { initiateSmallFileUpload, completeSmallFileUpload, initiateMultipartUpload, generateUploadPartURL, completeMultipartUpload, abortMultipartUpload, generatePublicDownloadLink } from "./r2.js";
import { getFileDownloadInfo, renameFile, createFolder, moveFileToFolder, renameFolder, shareFileWithUserByEmail, acceptFileShareInvitation, shareFolderWithUserByEmail, acceptFolderShareInvitation, deleteFile, deleteFolder } from "./db.js"
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
