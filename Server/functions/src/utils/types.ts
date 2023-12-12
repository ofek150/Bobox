export interface UploadFileParams {
    fileName: string;
    fileDirectory: string;
    fileType: string;
    fileSize: number;
}

export interface UploadPartParams {
    uploadId: string;
    fileName: string;
    fileDirectory: string;
    partNumber: number;
}

export interface CompleteMultiPartParams {
    uploadId: string;
    fileId: string
    fileName: string;
    fileDirectory: string;
    uploadResults: any[];
}

export interface AbortMultiPartUploadParams {
    uploadId: string;
    fileId: string;
    fileName: string;
    fileDirectory: string;
}

export interface GenerateDownloadLinkParams {
    fileId: string;
    neverExpires: boolean;
    expiresAt: Date | null;
}

export interface FileEntry {
    fileKey: string;
    fileName: string;
    fileType: string;
    fileSize: number;
}

export interface SharedFile {
    fileName: string;
    fileType: string;
    fileSize: number;
    uploadedAt: Date;
    downloadLinks: string[];
}

export interface LinkInfo {
    downloadLinks: string[];
    isPublic: boolean;
    neverExpires: boolean
    expiresAt: any | null;
}

export interface DownloadInfoParams {
    downloaderUid: string;
    ownerUid: string;
    fileId: string;
    linkId: string;
}