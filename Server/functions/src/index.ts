import { initializeApp } from "firebase-admin/app";
import { registerWithEmailAndPassword, onUserCreated } from "./authentication";
import { initiateSmallFileUpload, completeSmallFileUpload, initiateMultipartUpload, generateUploadPartURL, completeMultipartUpload, abortMultipartUpload, generatePublicDownloadLink, deleteFile } from "./r2";
import { getFileDownloadInfo, renameFile, createFolder, moveFileToFolder, renameFolder, shareFileWithUserByEmail, acceptFileShareInvitation, shareFolderWithUserByEmail, acceptFolderShareInvitation } from "./db"
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
    createFolder,
    moveFileToFolder,
    renameFolder,
    shareFileWithUserByEmail,
    acceptFileShareInvitation,
    shareFolderWithUserByEmail,
    acceptFolderShareInvitation
};
