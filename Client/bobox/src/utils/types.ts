export interface UploadFileParameters {
    fileName: string;
    fileDirectory: string;
    fileType: string;
    fileSize: number;
}

export interface UploadPartParameters {
    uploadId: string;
    fileName: string;
    fileDirectory: string;
    partNumber: number;
}

export interface CompleteMultiPartParameters {
    uploadId: string;
    fileId: string
    fileName: string;
    fileDirectory: string;
    uploadResults: any[];
}

export interface AbortMultiPartUploadParameters {
    uploadId: string;
    fileId: string;
    fileName: string;
    fileDirectory: string;
}