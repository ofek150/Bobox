export interface uploadFileParameters {
    fileName: string;
    fileDirectory: string;
    fileType: string;
    fileSize: number;
}

export interface uploadPartParameters {
    uploadId: string;
    fileName: string;
    fileDirectory: string;
    partNumber: number;
}

export interface completeMultiPartParameters {
    uploadId: string;
    fileName: string;
    fileDirectory: string;
    uploadResults: any[];
}

export interface abortMultiPartUploadParameters {
    uploadId: string;
    fileName: string;
    fileDirectory: string;
}