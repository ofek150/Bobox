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
    folderId: string;
}

export interface Folder {
    folderId: string;
    folderName: string;
    inFolder: string;
    createdAt: string | null;
    files: string[];
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
    inFolder: string;
}

export interface MoveFileToFolderParams {
    fileId: string;
    currentFolderId: string;
    newFolderId: string;
}