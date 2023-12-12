import React, { useRef, useState } from "react";
import { Typography, Button, Box, InputAdornment, OutlinedInput, IconButton } from "@mui/material";
import { MIN_MULTIPART_UPLOAD_SIZE, MAX_UPLOAD_RETRIES, LARGE_FILE_MAX_SIZE } from "../utils/constants";
import { initiateSmallFileUpload, CompleteSmallFileUpload, initiateMultipartUpload, generateUploadPartURL, completeMultipartUpload, AbortMultipartUpload, } from "../services/firebase";
import { UploadFileParams, UploadPartParams, CompleteMultiPartParams } from "../utils/types";
import axios, { AxiosProgressEvent, AxiosRequestConfig } from "axios";
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import useAbortUploadData from "../hooks/useAbortUploadData";
import DoneIcon from '@mui/icons-material/Done';
import CancelIcon from '@mui/icons-material/Cancel';
import CircularProgressWithLabel from "../components/UI/CircularProgressWithLabel";
import { determinePartSize } from "../utils/helpers";

const UploadFile: React.FC = () => {
    const [progress, setProgress] = useState<number>(0);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploaded, setUploaded] = useState(false);
    const [multiPartUploading, setMultiPartUploading] = useState(false);
    const [abortUploadData, setAbortUploadData] = useAbortUploadData();
    const [isCancelled, setIsCancelled] = useState(false);
    const abortController = new AbortController();
    const isCancelledRef = useRef(isCancelled);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setSelectedFile(event.target.files[0]);
            setUploaded(false);
        }
    };

    const uploadSmallFile = async (fileParameters: UploadFileParams) => {
        if (!selectedFile || !selectedFile.name || !selectedFile.size || !selectedFile.type) return;
        const { uploadUrl, fileId, error } = await initiateSmallFileUpload(fileParameters);
        if (error) {
            handleError(error);
            return;
        }

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

            setUploading(false);
            setProgress(0);
            if (response.status == 200) {
                CompleteSmallFileUpload(fileId);
                finishUpload();
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            handleError(error);
        }
    }

    const uploadPart = async (uploadPartUrl: string, parts: any, fileSize: number, chunk: any, i: number, offset: number, abortController: AbortController, updateProgress: (increment: number) => void) => {
        let retryCount = 0;

        while (retryCount < MAX_UPLOAD_RETRIES) {
            try {
                console.log(`Part ${i} is isCancelled: ${isCancelledRef.current}`);
                if (isCancelledRef.current) {
                    return;
                }

                const response = await axios.put(
                    uploadPartUrl,
                    chunk,
                    {
                        headers: {
                            'Content-Type': 'application/octet-stream',
                            'Content-Length': chunk.size.toString()
                        },
                        signal: abortController.signal,
                        onUploadProgress: (progressEvent) => {
                            // Calculate the increment in progress for this part
                            if (progressEvent.total) {
                                const partProgress = (progressEvent.loaded / progressEvent.total) * 100;
                                updateProgress(partProgress);
                            }
                        }
                    }
                );

                const Etag = response.headers['etag'];

                if (response.status === 200) {
                    parts.push({ 'ETag': Etag, 'partNumber': i });
                    return true;
                }
            } catch (error: any) {
                if (error && error.code === 'ECONNABORTED') throw new Error("Upload aborted");
                console.error(`Upload part ${i} attempt ${retryCount + 1} failed:`, error);
                retryCount++;
            }
        }

        if (retryCount === MAX_UPLOAD_RETRIES) {
            throw new Error(`Upload part ${i} failed after ${MAX_UPLOAD_RETRIES} attempts`);
        }
    };

    const uploadLargeFile = async (fileParameters: UploadFileParams) => {
        if (!selectedFile) return;
        const { uploadId, fileId, error } = await initiateMultipartUpload(fileParameters);
        if (error) {
            handleError(error);
            return;
        }

        if (!uploadId || !fileId) return;
        console.log(`uploadId: ${uploadId} fileId: ${fileId}`);

        setAbortUploadData({
            uploadId: uploadId,
            fileId: fileId,
            fileName: selectedFile.name,
            fileDirectory: ''
        })
        const parts: any = [];
        const uploadPromises = [];
        const partSize = determinePartSize(fileParameters.fileSize);
        const expectedNumParts = Math.ceil(fileParameters.fileSize / partSize);
        const partProgressArray = Array(expectedNumParts).fill(0);

        for (let offset = 0, i = 1; offset < fileParameters.fileSize; offset += partSize, i++) {
            if (isCancelledRef.current) {
                return;
            }
            const chunk = await selectedFile.slice(offset, offset + partSize);

            const uploadPartParameters: UploadPartParams= {
                uploadId: uploadId,
                fileName: fileParameters.fileName,
                fileDirectory: fileParameters.fileDirectory,
                partNumber: i
            };
            const { uploadUrl, error } = await generateUploadPartURL(uploadPartParameters);
            if (error) {
                handleError(error);
                return;
            }
            uploadPromises.push(
                uploadPart(uploadUrl, parts, fileParameters.fileSize, chunk, i, offset, abortController, (partProgress) => {
                    // Update the part's progress in the array
                    partProgressArray[i - 1] = partProgress;

                    // Calculate the overall progress based on the sum of part progress
                    const overallProgress = (partProgressArray.reduce((sum, value) => sum + value, 0) / expectedNumParts);
                    setProgress(overallProgress);
                }).catch((error: any) => {
                    handleError(error);
                    return;
                })
            );
        }

        try {
            const uploadResults = await Promise.all(uploadPromises);

        } catch (error: any) {
            if (error & error.message) console.error("Failed to upload file", error.meessage);
            await AbortMultipartUpload(abortUploadData);
            handleError(error);
            return;
        }
        parts.sort((a: any, b: any) => a.partNumber - b.partNumber);

        const completeMultipartUploadParameters: CompleteMultiPartParams= {
            uploadId: uploadId,
            fileId: fileId,
            fileName: fileParameters.fileName,
            fileDirectory: fileParameters.fileDirectory,
            uploadResults: parts
        }
        if (isCancelledRef.current) {
            return;
        }
        const result: any = await completeMultipartUpload(completeMultipartUploadParameters);
        if (result.error) {
            handleError(error);
            return;
        }
        finishUpload();
    }
    const handleUpload = async () => {
        if (selectedFile && selectedFile.name && selectedFile.size && selectedFile.type) {
            if (selectedFile.size > LARGE_FILE_MAX_SIZE) {
                handleError(new Error("The file is bigger than the max allowed file size - " + LARGE_FILE_MAX_SIZE.toString()));
            }
            setIsCancelled(false);
            isCancelledRef.current = false;
            setUploading(true);

            const fileParameters: UploadFileParams = {
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

    const handleCancel = async () => {
        console.log("Canceling upload...");
        abortController.abort();
        setUploading(false);
        setProgress(0);
        setIsCancelled(true);
        isCancelledRef.current = true;
        await AbortMultipartUpload(abortUploadData);
        setAbortUploadData({
            uploadId: '',
            fileId: '',
            fileName: '',
            fileDirectory: ''
        });
    }

    const finishUpload = () => {
        setUploading(false);
        setProgress(0);
        setUploaded(true);
        setAbortUploadData({
            uploadId: '',
            fileId: '',
            fileName: '',
            fileDirectory: ''
        })
        setSelectedFile(null);
    }

    const handleError = (error: any) => {
        if (error && error.message) console.error(error.meessage);
        setUploading(false);
        setMultiPartUploading(false);
        setProgress(0);
        setUploaded(false);
        setSelectedFile(null);
        // Display error
        // Handle error
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
            {uploading && <CircularProgressWithLabel value={progress} />}
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
                {uploading && multiPartUploading && (
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
