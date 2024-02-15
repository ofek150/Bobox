import { ACCESS_LEVEL } from "./constants";

export type Variant = "default" | "error" | "success" | "warning" | "info" | undefined;

export interface UploadFileParams {
    fileName: string;
    folderId: string;
    fileType: string;
    fileSize: number;
}

export interface UploadPartParams {
    uploadId: string;
    fileId: string;
    partNumber: number;
}

export interface CompleteMultiPartParams {
    uploadId: string;
    fileId: string
    uploadResults: any[];
}

export interface AbortMultiPartUploadParams {
    uploadId: string;
    fileId: string;
}

export interface GenerateDownloadLinkParams {
    fileId: string;
    neverExpires: boolean;
    expiresAt: Date | null;
}

export interface SharedFile {
    fileName: string;
    fileType: string;
    fileSize: number;
    uploadedAt: Date;
    downloadLink: string;
}

export interface DownloadInfoParams {
    ownerUid: string;
    fileId: string;
    downloadId: string;
}

export interface File {
    fileId: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    uploadedAt: string;
    parentFolderId: string;
    shared: boolean;
    ownerUid: string;
}

export interface Folder {
    folderId: string;
    folderName: string;
    parentFolderId: string;
    createdAt: string | null;
    files: string[];
    folders: string[];
    collaborators: {};
    shared: boolean;
    ownerUid: string;
}

export interface Files {
    folders: Folder[];
    files: File[];
}

export interface RenameFileParams {
    fileId: string;
    newFileName: string;
}

export interface CreateFolderParams {
    folderName: string;
    parentFolderId: string;
}

export interface MoveFileToFolderParams {
    fileId: string;
    currentFolderId: string;
    newFolderId: string;
}
export interface RenameFolderParams {
    folderId: string;
    newFolderName: string;
}

export interface ShareFileParams {
    email: string;
    fileId: string;
    accessLevel: ACCESS_LEVEL;
}

export interface ShareFolderParams {
    email: string;
    folderId: string;
    accessLevel: ACCESS_LEVEL;
}