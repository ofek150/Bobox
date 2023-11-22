import React, { useEffect, useState } from "react";
import { Typography, LinearProgress, Button, Box, InputAdornment, OutlinedInput, IconButton } from "@mui/material";
import { MB, MIN_MULTIPART_UPLOAD_SIZE } from "../utils/constants";
import { initiateSmallFileUpload, CompleteSmallFileUpload, initiateMultipartUpload, generateUploadPartURL, completeMultipartUpload, AbortMultipartUpload, } from "../services/firebase";
import { UploadFileParameters, UploadPartParameters, CompleteMultiPartParameters, AbortMultiPartUploadParameters } from "../utils/types";
import axios, { AxiosProgressEvent, AxiosRequestConfig } from "axios";
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import useAbortUploadData from "../hooks/useAbortUploadData";
import DoneIcon from '@mui/icons-material/Done';
import CancelIcon from '@mui/icons-material/Cancel';

const UploadFile: React.FC = () => {
    const [progress, setProgress] = useState<number>(0);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploaded, setUploaded] = useState(false);
    const [multiPartUploading, setMultiPartUploading] = useState(false);
    const [abortUploadData, setAbortUploadData] = useAbortUploadData();
    const [isCancelled, setIsCancelled] = useState(false);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setSelectedFile(event.target.files[0]);
            setUploaded(false);
        }
    };

    const uploadSmallFile = async (fileParameters: UploadFileParameters) => {
        if (!selectedFile || !selectedFile.name || !selectedFile.size || !selectedFile.type) return;
        const { uploadUrl, fileId, error } = await initiateSmallFileUpload(fileParameters);
        if(error) {
            handleError(error);
            return;
        }
        if (!uploadUrl)
            console.log("Upload url: " + uploadUrl);
        try {
            const config: AxiosRequestConfig = {
                onUploadProgress: (progressEvent: AxiosProgressEvent) => {
                    if (progressEvent.total) {
                        const progressPercentage = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        setProgress(progressPercentage);
                    }
                },
                headers: {
                    "Content-Type": selectedFile.type
                }
            };

            const response = await axios.put(uploadUrl, selectedFile, config);

            console.log("Response: ", response);
            setUploading(false);
            setProgress(0);
            if (response.status == 200) {
                CompleteSmallFileUpload(fileId)
                setUploaded(true);
                setSelectedFile(null);
            }
        } catch (error) {
            console.error('Error uploading file:', error);
        }
    }

    const uploadLargeFile = async (fileParameters: UploadFileParameters) => {
        if (!selectedFile) return;
        const { uploadId, fileId, error } = await initiateMultipartUpload(fileParameters);
        if(error) {
            handleError(error);
            return;
        }

        console.log("Upload id: ", uploadId);
        console.log("File id: ", fileId);
        
        if (!uploadId || !fileId) return;

        setAbortUploadData({
            uploadId: uploadId,
            fileId: fileId,
            fileName: selectedFile.name,
            fileDirectory: ''
        })

        const partSize = 8 * MB;
        const parts: any = [];
        const uploadPromises = [];
        //const expectedNumParts = Math.ceil(fileParameters.fileSize / partSize);

        for (let offset = 0, i = 1; offset < fileParameters.fileSize; offset += partSize, i++) {
            if(isCancelled) {
                setIsCancelled(false);
                return;
            }
            const chunk = await selectedFile.slice(offset, offset + partSize);

            const uploadPartParameters: UploadPartParameters = {
                uploadId: uploadId,
                fileName: fileParameters.fileName,
                fileDirectory: fileParameters.fileDirectory,
                partNumber: i
            };

            const uploadPartUrl: string = await generateUploadPartURL(uploadPartParameters);
            uploadPromises.push(
                axios.put(uploadPartUrl, chunk,
                    {
                        headers: {
                            'Content-Type': 'application/octet-stream',
                            'Content-Length': chunk.size.toString()
                        }
                    })
                    .then(async (response) => {
                        console.log("Uploaded part ", i);
                        const Etag = response.headers['etag'];
                        if (response.status == 200) {
                            parts.push({ 'ETag': Etag, 'partNumber': i });
                            const currentProgress = Math.round(((offset + partSize) * 100) / fileParameters.fileSize);
                            setProgress(currentProgress);
                        }
                    }).catch(() => {
                        //Retry upload
                    })
            );
        }

        if(isCancelled) {
            setIsCancelled(false);
            return;
        }

        const uploadResults = await Promise.all(uploadPromises);
        parts.sort((a: any, b: any) => a.partNumber - b.partNumber);

        console.log("Ordered Upload results: ", parts);
        const completeMultipartUploadParameters: CompleteMultiPartParameters = {
            uploadId: uploadId,
            fileId: fileId,
            fileName: fileParameters.fileName,
            fileDirectory: fileParameters.fileDirectory,
            uploadResults: parts
        }
        if(isCancelled) {
            setIsCancelled(false);
            return;
        }
        if (await completeMultipartUpload(completeMultipartUploadParameters)) {
            setUploading(false);
            setProgress(0);
            setUploaded(true);
            setSelectedFile(null);
        }
        else {
            //SHOW ERROR
            setUploading(false);
            setMultiPartUploading(false);
            setProgress(0);
            setUploaded(false);
            setSelectedFile(null);
        }
    }
    const handleUpload = async () => {
        if (selectedFile && selectedFile.name && selectedFile.size && selectedFile.type) {
            setUploading(true);

            const fileParameters: UploadFileParameters = {
                fileName: selectedFile.name,
                fileDirectory: "",
                fileType: selectedFile.type,
                fileSize: selectedFile.size
            };

            if (selectedFile.size >= MIN_MULTIPART_UPLOAD_SIZE) {
                setMultiPartUploading(true);
                uploadLargeFile(fileParameters);
            }
            else {
                uploadSmallFile(fileParameters);
            }

        } else {
            console.log('No file selected.');
        }
    };

    const handleCancel = () => {
        console.log("Canceling upload...");
        setUploading(false);
        setIsCancelled(true);
        AbortMultipartUpload(abortUploadData);
    }

    const handleError = (error: any) => {
        // Display error
        // Handle error
        setUploading(false);
    }

    return (
        <Box
            display="flex"
            flexDirection="column"
            minHeight="100vh"
            alignItems="center"
            justifyContent="center"
            marginBottom="8rem"
        >
            <Typography variant="h4" gutterBottom sx={{ mb: "3rem" }}>
                Upload a File
            </Typography>
            <div className="input-container" style={{ marginBottom: '16px' }}>
                <OutlinedInput
                    type="file"
                    onChange={handleFileChange}
                    endAdornment={
                        <InputAdornment position="end">
                            <IconButton
                                component="label"
                                htmlFor="file-upload"
                                color="primary"
                                aria-label="upload file"
                                edge="end"
                                disabled={uploading}
                            >
                                <CloudUploadIcon />
                            </IconButton>
                        </InputAdornment>
                    }
                />
            </div>
            {uploading && <LinearProgress value={progress} /> && <div>Progress: {progress}</div>}
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
                <Button
                    variant="contained"
                    color={uploading ? 'secondary' : uploaded ? 'success' : 'primary'}
                    onClick={(!uploading && !uploaded) ? handleUpload : () => { }}
                    disabled={uploading}
                >
                    {uploading ? 'Cancel' : uploaded ? 'Done' : 'Upload'}
                    {uploaded && <DoneIcon style={{ marginLeft: '8px' }} />}
                </Button>
                { uploading && multiPartUploading && (
                    <IconButton
                        color="secondary"
                        onClick={handleCancel}
                        aria-label="cancel upload"
                    >
                        <CancelIcon />
                    </IconButton>
                )}
            </div>
        </Box>
    );
}
export default UploadFile;
