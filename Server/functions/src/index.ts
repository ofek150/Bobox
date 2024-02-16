import { initializeApp } from "firebase-admin/app";
import { registerWithEmailAndPassword, onUserCreated } from "./authentication";
import { initiateSmallFileUpload, completeSmallFileUpload, initiateMultipartUpload, generateUploadPartURL, completeMultipartUpload, abortMultipartUpload, generatePublicDownloadLink } from "./r2";
import { getFileDownloadInfo, renameFile, createFolder, moveFileToFolder, renameFolder, shareFileWithUserByEmail, acceptFileShareInvitation, shareFolderWithUserByEmail, acceptFolderShareInvitation, deleteFile, deleteFolder } from "./db"
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
