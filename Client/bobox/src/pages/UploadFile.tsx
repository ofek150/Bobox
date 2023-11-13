import React, { useState } from "react";
import { Typography, LinearProgress, Button, Box, InputAdornment, OutlinedInput, IconButton } from "@mui/material";
import { getUploadUrl } from "../services/firebase";
import { uploadFileParameters } from "../utils/types";
import axios, { AxiosProgressEvent, AxiosRequestConfig } from "axios";
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CancelIcon from '@mui/icons-material/Cancel';
import DoneIcon from '@mui/icons-material/Done';

const UploadFile: React.FC = () => {
    const [progress, setProgress] = useState<number>(0);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploaded, setUploaded] = useState(false);
    const controller = new AbortController();
    const minMultiUploadSize: number = 100 * 1024 * 1024;

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setSelectedFile(event.target.files[0]);
            setUploaded(false);
        }
    };

    const uploadSmallFile = async (fileParameters: uploadFileParameters) => {
        if (!selectedFile || !selectedFile.name || !selectedFile.size || !selectedFile.type) return;
        const uploadUrl: string = await getUploadUrl(fileParameters);
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
                    setUploaded(true);
                    setSelectedFile(null);
                }
            } catch (error) {
                console.error('Error uploading file:', error);
            }
    }

    const uploadLargeFile = async (fileParameters: uploadFileParameters) => {

    }
    const handleUpload = async () => {
        if (selectedFile && selectedFile.name && selectedFile.size && selectedFile.type) {
            setUploading(true);

            const fileParameters: uploadFileParameters = {
                fileName: selectedFile.name,
                fileDirectory: "",
                fileType: selectedFile.type,
                fileSize: selectedFile.size
            };

            if(selectedFile.size > minMultiUploadSize) {
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
