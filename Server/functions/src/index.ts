import { initializeApp } from "firebase-admin/app";
import { registerWithEmailAndPassword, onUserCreated } from "./authentication";
import { initiateSmallFileUpload, completeSmallFileUpload, initiateMultipartUpload, generateUploadPartURL, completeMultipartUpload, abortMultipartUpload, generatePublicDownloadLink, deleteFile } from "./r2";
import { getFileDownloadInfo, generatePrivateDownloadLink, getPrivateDownloadId, renameFile, createFolder, moveFileToFolder, renameFolder, shareFileWithUserByEmail, acceptFileShareInvitation } from "./db"
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
    generatePrivateDownloadLink,
    getPrivateDownloadId,
    renameFile,
    deleteFile,
    createFolder,
    moveFileToFolder,
    renameFolder,
    shareFileWithUserByEmail,
    acceptFileShareInvitation
};
