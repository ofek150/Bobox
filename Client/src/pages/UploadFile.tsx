import React, { useEffect, useRef, useState } from "react";
import { Typography, Button, Box, InputAdornment, OutlinedInput, IconButton, FormControlLabel, Checkbox, Paper, Container, Select, MenuItem, CircularProgress } from "@mui/material"
import { MIN_MULTIPART_UPLOAD_SIZE, MAX_UPLOAD_RETRIES, LARGE_FILE_MAX_SIZE, MAX_FILE_SIZE_STRING } from "../utils/constants";
import { initiateSmallFileUpload, completeSmallFileUpload, initiateMultipartUpload, generateUploadPartURL, completeMultipartUpload, abortMultipartUpload, generatePublicDownloadLink } from "../services/firebase";
import { UploadFileParams, UploadPartParams, CompleteMultiPartParams, GenerateDownloadLinkParams } from "../utils/types";
import axios, { AxiosProgressEvent, AxiosRequestConfig } from "axios";
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import useAbortUploadData from "../hooks/useAbortUploadData";
import CancelIcon from '@mui/icons-material/Cancel';
import CircularProgressWithLabel from "../components/UI/CircularProgressWithLabel";
import { determinePartSize } from "../utils/helpers";
import { useParams } from "react-router-dom";
import NotFoundPage from "./NotFoundPage";
import { enqueueSnackbar } from "notistack";

const UploadFile: React.FC = () => {
    const { folderId } = useParams();
    const [progress, setProgress] = useState<number>(0);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploaded, setUploaded] = useState(false);
    const [multiPartUploading, setMultiPartUploading] = useState(false);
    const [abortUploadData, setAbortUploadData] = useAbortUploadData();
    const [isCancelled, setIsCancelled] = useState(false);
    const abortController = new AbortController();
    const isCancelledRef = useRef(isCancelled);
    const [expiryDays, setExpiryDays] = useState<number>(1);

    const fileIdRef = useRef("");

    const [neverExpires, setNeverExpires] = useState(false);
    const [generatingLink, setGeneratingLink] = useState(false);
    const [expiryDate, setExpiryDate] = useState<Date | null>(null);

    const [shareLink, setShareLink] = useState<string | null>(null);

    if (!folderId) return <NotFoundPage />;


    useEffect(() => {
        console.log('Uploading: ' + uploading, ' Uploaded: ' + uploaded, ' Generating link: ' + generatingLink);
    }, [uploading, uploaded, generatingLink])

    useEffect(() => {
        if (!neverExpires && uploaded) {
            const newExpiryDate = new Date();
            newExpiryDate.setDate(newExpiryDate.getDate() + expiryDays);
            setExpiryDate(newExpiryDate);
        }
    }, [expiryDays, neverExpires, uploaded]);

    useEffect(() => {
        console.log("Expiry date: ", expiryDate);
    }, [expiryDate]);

    const getNextWeekDate = () => {
        const today = new Date();
        const nextWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7);
        return nextWeek;
    }

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
            handleUploadError(error);
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
            const { success, error } = await completeSmallFileUpload(fileId)
            if (response.status == 200 && success) {
                console.log(response);
                console.log("Success: ", success);
                finishUpload(fileId);
            }
            else {
                if (error) {
                    throw Error(error.meessage);
                }
                else {
                    throw Error("Unknown error occured while uploading the file, please try again later!");
                }
            }
        } catch (error: any) {
            console.error('Error uploading file:', error);
            if (error && error.message) {
                handleUploadError(error.message);
            }
            else {
                handleUploadError("Unknown error occured while uploading the file, please try again later!");
            }
        }
    }

    const uploadPart = async (uploadPartUrl: string, parts: any, chunk: any, i: number, abortController: AbortController, updateProgress: (increment: number) => void) => {
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
            handleUploadError(error);
            return;
        }

        if (!uploadId || !fileId) return;
        console.log(`uploadId: ${uploadId} fileId: ${fileId}`);

        setAbortUploadData({
            uploadId: uploadId,
            fileId: fileId
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

            const uploadPartParameters: UploadPartParams = {
                uploadId: uploadId,
                fileId: fileId,
                partNumber: i
            };
            const { uploadUrl, error } = await generateUploadPartURL(uploadPartParameters);
            if (error) {
                handleUploadError(error);
                return;
            }
            uploadPromises.push(
                uploadPart(uploadUrl, parts, chunk, i, abortController, (partProgress) => {
                    // Update the part's progress in the array
                    partProgressArray[i - 1] = partProgress;

                    // Calculate the overall progress based on the sum of part progress
                    const overallProgress = (partProgressArray.reduce((sum, value) => sum + value, 0) / expectedNumParts);
                    setProgress(overallProgress);
                }).catch(async (error: any) => {
                    if (error & error.message) {
                        console.error("Failed to upload file", error.meessage);
                        handleUploadError(error.message);
                    }
                    else {
                        handleUploadError()
                    }

                    await abortMultipartUpload(abortUploadData);
                    return;
                })
            );
        }
        try {
            await Promise.all(uploadPromises);

        } catch (error: any) {
            if (error & error.message) console.error("Failed to upload file", error.meessage);
            await abortMultipartUpload(abortUploadData);
            handleUploadError(error);
            return;
        }
        parts.sort((a: any, b: any) => a.partNumber - b.partNumber);

        const completeMultipartUploadParameters: CompleteMultiPartParams = {
            uploadId: uploadId,
            fileId: fileId,
            uploadResults: parts
        }
        if (isCancelledRef.current) {
            return;
        }
        const result: any = await completeMultipartUpload(completeMultipartUploadParameters);

        if (result.error) {
            handleUploadError(error);
            return;
        }
        finishUpload(fileId);
    }

    const handleUpload = async () => {
        if (selectedFile && selectedFile.name && selectedFile.size && selectedFile.type) {
            setUploaded(false);
            if (selectedFile.size > LARGE_FILE_MAX_SIZE) {
                handleUploadError(`The file is bigger than the max allowed file size (${MAX_FILE_SIZE_STRING})`);
                return;
            }
            setIsCancelled(false);
            isCancelledRef.current = false;
            setShareLink(null);
            setUploading(true);

            const fileParameters: UploadFileParams = {
                fileName: selectedFile.name,
                folderId: folderId,
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
        fileIdRef.current = "";
        if (multiPartUploading) await abortMultipartUpload(abortUploadData);
        setMultiPartUploading(false);
        setAbortUploadData({
            uploadId: '',
            fileId: ''
        });
    }

    const finishUpload = (fileId: string) => {
        setUploading(false);
        setProgress(0);
        fileIdRef.current = fileId;
        setUploaded(true);
        setAbortUploadData({
            uploadId: '',
            fileId: ''
        })
        setSelectedFile(null);
    }

    const handleGenerateDownloadLink = async () => {
        if (uploaded) {
            setGeneratingLink(true); // Set generatingLink to true when starting to generate the link
            console.log("Expires at: ", expiryDate);
            const generateDownloadLinkParams: GenerateDownloadLinkParams = {
                fileId: fileIdRef.current,
                neverExpires: neverExpires,
                expiresAt: neverExpires ? null : expiryDate ? expiryDate : getNextWeekDate(),
            };
            const { link, error } = await generatePublicDownloadLink(generateDownloadLinkParams);
            if (error) {
                handleError(error)
                setGeneratingLink(false); // Set generatingLink to false if there's an error
                return;
            }
            setShareLink(link);
            console.log('shareLink:', link);
            setGeneratingLink(false); // Set generatingLink to false after the link is generated
        }
    };

    const handleError = (error: string | null = null) => {
        console.log("Error occured, error: ", error);
        const message: string = error ? error : 'Unexpected error occured, please try again later!';
        enqueueSnackbar(message, {
            variant: 'error',
            preventDuplicate: true
        });
    }

    const handleUploadError = (error: string | null = null) => {
        setUploading(false);
        setMultiPartUploading(false);
        setProgress(0);
        setUploaded(false);
        //handleCancel();
        handleError(error);
    }

    const copyLink = () => {
        if (!shareLink) return;
        navigator.clipboard.writeText(shareLink).then(() => {
            console.log('Link copied to clipboard:', shareLink);
        });
    };

    return (
        <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Container maxWidth="xs">
                <Paper elevation={3} sx={{ p: 2, borderRadius: 5, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                    <Typography variant="h4" gutterBottom sx={{ mb: 2, fontWeight: "bold" }}>
                        Upload a File
                    </Typography>
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
                        sx={{ mb: 2 }}
                    />

                    {uploading && <CircularProgressWithLabel value={progress} sx={{ mt: 1, mb: 2 }} />}
                    {!uploaded && !uploading && !generatingLink &&
                        (
                            <Button
                                variant="contained"
                                color={uploading ? 'secondary' : uploaded ? 'success' : 'primary'}
                                onClick={handleUpload}
                                disabled={uploading || uploaded}
                                sx={{ mt: 1 }}
                            >
                                Upload
                            </Button>
                        )
                    }
                    {generatingLink && <CircularProgress />}
                    {uploading && multiPartUploading && (
                        <IconButton
                            color="secondary"
                            onClick={handleCancel}
                            aria-label="cancel upload"
                        >
                            <CancelIcon />
                        </IconButton>
                    )}
                    {/* Generate Download Link Button */}
                    {uploaded && !shareLink && !generatingLink && (
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={handleGenerateDownloadLink}
                            sx={{ mb: 1 }}
                        >
                            Generate Download Link
                        </Button>
                    )}
                    {uploaded && !shareLink && !generatingLink && (
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={neverExpires}
                                    onChange={(e) => setNeverExpires(e.target.checked)}
                                    color="primary"
                                />
                            }
                            label="Never Expires"
                            sx={{ mb: 1 }}
                        />
                    )}
                    {/* Expiry Date Input */}
                    {!neverExpires && uploaded && !shareLink && !generatingLink && (
                        <Box sx={{ mb: 1 }}>
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                Link expiry days
                            </Typography>
                            <Select
                                value={expiryDays}
                                onChange={(e) => setExpiryDays(e.target.value as number)}
                                displayEmpty
                                input={<OutlinedInput label="Link expiry days" />}
                                sx={{ width: "100%" }}
                            >
                                {[1, 2, 3, 4, 5, 6, 7].map((days) => (
                                    <MenuItem key={days} value={days}>
                                        {days} day{days !== 1 ? "s" : ""}
                                    </MenuItem>
                                ))}
                            </Select>
                        </Box>
                    )}

                    {/* Display the generated download link */}
                    {shareLink && uploaded && (
                        <>
                            <Typography variant="subtitle2" color="textPrimary" sx={{ mb: 2, mt: 2 }}>
                                Share this link with others to view the uploaded file.
                            </Typography>
                            <Button variant="outlined" onClick={copyLink}>Copy link to Clipboard</Button>
                        </>
                    )}
                </Paper>
            </Container>
        </Box>
    );
}
export default UploadFile;
