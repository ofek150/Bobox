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
}

export interface Files {
    files: File[];
}

export interface RenameFileParams {
    fileId: string;
    newFileName: string;
}