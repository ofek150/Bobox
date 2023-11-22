import React, { useEffect, useState } from "react";
import { Typography, LinearProgress, Button, Box, InputAdornment, OutlinedInput, IconButton } from "@mui/material";
import { MB, MIN_MULTIPART_UPLOAD_SIZE } from "../utils/constants";
import { initiateSmallFileUpload, CompleteSmallFileUpload, initiateMultipartUpload, generateUploadPartURL, completeMultipartUpload, AbortMultipartUpload, } from "../services/firebase";
import { UploadFileParameters, UploadPartParameters, CompleteMultiPartParameters, AbortMultiPartUploadParameters } from "../utils/types";
import axios, { AxiosProgressEvent, AxiosRequestConfig } from "axios";
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
//import CancelIcon from '@mui/icons-material/Cancel';
import DoneIcon from '@mui/icons-material/Done';

const UploadFile: React.FC = () => {
    const [progress, setProgress] = useState<number>(0);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploaded, setUploaded] = useState(false);

    useEffect(() => {
        const params: AbortMultiPartUploadParameters = {
            uploadId: '',
            fileName: '',
            fileDirectory: ''
        }
        let doIt = false;
        // doIt = true;
        if (!doIt) return;
        AbortMultipartUpload(params).then((response) => {

            console.log("Abort response: ", response);
        });
    }, []);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setSelectedFile(event.target.files[0]);
            setUploaded(false);
        }
    };

    const uploadSmallFile = async (fileParameters: UploadFileParameters) => {
        if (!selectedFile || !selectedFile.name || !selectedFile.size || !selectedFile.type) return;
        const { uploadUrl, fileId } = await initiateSmallFileUpload(fileParameters);
        //const uploadUrl: string = await initiateSmallFileUpload(fileParameters);
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
        const { uploadId, fileId } = await initiateMultipartUpload(fileParameters);
        if (!uploadId) return;

        const partSize = 8 * MB;
        const parts: any = [];
        const uploadPromises = [];
        const expectedNumParts = Math.ceil(fileParameters.fileSize / partSize);

        for (let offset = 0, i = 1; offset < fileParameters.fileSize; offset += partSize, i++) {
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
        if (await completeMultipartUpload(completeMultipartUploadParameters)) {
            setUploading(false);
            setProgress(0);
            setUploaded(true);
            setSelectedFile(null);
        }
        else {
            setUploading(false);
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
                uploadLargeFile(fileParameters)
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
        //DO SOMETHING
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
                {/* {uploading && (
                    <IconButton
                        color="secondary"
                        onClick={handleCancel}
                        aria-label="cancel upload"
                    >
                        <CancelIcon />
                    </IconButton>
                )} */}
            </div>
        </Box>
    );
}
export default UploadFile;
