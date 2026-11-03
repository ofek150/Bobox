import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, Copy, FileUp, Link as LinkIcon, Loader2, Upload, X } from "lucide-react";
import axios, { AxiosProgressEvent, AxiosRequestConfig } from "axios";
import { toast } from "sonner";

import { MIN_MULTIPART_UPLOAD_SIZE, MAX_UPLOAD_RETRIES, LARGE_FILE_MAX_SIZE, MAX_FILE_SIZE_STRING } from "../utils/constants";
import { initiateSmallFileUpload, completeSmallFileUpload, initiateMultipartUpload, generateUploadPartURL, completeMultipartUpload, abortMultipartUpload, generatePublicDownloadLink } from "../services/firebase";
import { UploadFileParams, UploadPartParams, CompleteMultiPartParams, GenerateDownloadLinkParams } from "../utils/types";
import useAbortUploadData from "../hooks/useAbortUploadData";
import CircularProgressWithLabel from "../components/common/CircularProgressWithLabel";
import { FileIcon } from "../components/common/FileTypeIcon";
import NotFoundPage from "./NotFoundPage";
import { determinePartSize, formatFileSize } from "../utils/helpers";
import { copyToClipboard, toFriendlyMessage } from "../utils/errors";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const UploadFile: React.FC = () => {
    const { folderId } = useParams();
    const [progress, setProgress] = useState<number>(0);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploaded, setUploaded] = useState(false);
    const [multiPartUploading, setMultiPartUploading] = useState(false);
    const [abortUploadData, setAbortUploadData] = useAbortUploadData();
    const [isCancelled, setIsCancelled] = useState(false);
    // One controller per upload: created at upload start, aborted on cancel.
    // (A per-render controller used to leave the cancel button aborting a dead controller.)
    const abortControllerRef = useRef<AbortController | null>(null);
    const isCancelledRef = useRef(isCancelled);
    const [expiryDays, setExpiryDays] = useState<number>(1);
    const [dragging, setDragging] = useState(false);

    const fileIdRef = useRef("");
    const uploadedFileNameRef = useRef("");

    const [neverExpires, setNeverExpires] = useState(false);
    const [generatingLink, setGeneratingLink] = useState(false);
    const [expiryDate, setExpiryDate] = useState<Date | null>(null);

    const [shareLink, setShareLink] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (!neverExpires && uploaded) {
            const newExpiryDate = new Date();
            newExpiryDate.setDate(newExpiryDate.getDate() + expiryDays);
            setExpiryDate(newExpiryDate);
        }
    }, [expiryDays, neverExpires, uploaded]);

    const getNextWeekDate = () => {
        const today = new Date();
        const nextWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7);
        return nextWeek;
    }

    const selectFile = (file: File | null | undefined) => {
        if (!file) return;
        if (file.size > LARGE_FILE_MAX_SIZE) {
            toast.error(`"${file.name}" is ${formatFileSize(file.size)} — the maximum is ${MAX_FILE_SIZE_STRING}.`, { id: 'file-too-big' });
            return;
        }
        setSelectedFile(file);
        setUploaded(false);
        setShareLink(null);
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) selectFile(event.target.files[0]);
    };

    const handleDrop = (event: React.DragEvent) => {
        event.preventDefault();
        setDragging(false);
        if (!uploading) selectFile(event.dataTransfer.files?.[0]);
    };

    const uploadSmallFile = async (fileParameters: UploadFileParams) => {
        if (!selectedFile) return;
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
                    "Content-Type": fileParameters.fileType
                },
                signal: abortControllerRef.current?.signal
            };

            const response = await axios.put(uploadUrl, selectedFile, config);
            const { success, error } = await completeSmallFileUpload(fileId)
            if (response.status == 200 && success) {
                finishUpload(fileId);
            }
            else {
                if (error) {
                    throw new Error(error);
                }
                else {
                    throw new Error("The upload did not finish. Please try again.");
                }
            }
        } catch (error: any) {
            console.error('Error uploading file:', error);
            if (axios.isCancel(error)) return; // cancelled via the Cancel button
            handleUploadError(toFriendlyMessage(error, "The upload failed. Please try again."));
        }
    }

    const uploadPart = async (uploadPartUrl: string, parts: any, chunk: any, i: number, abortController: AbortController, updateProgress: (increment: number) => void) => {
        let retryCount = 0;

        while (retryCount < MAX_UPLOAD_RETRIES) {
            try {
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
                if (axios.isCancel(error) || error?.code === 'ECONNABORTED') throw new Error("Upload aborted");
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

        setAbortUploadData({
            uploadId: uploadId,
            fileId: fileId
        })
        const parts: any = [];
        const uploadPromises = [];
        const partSize = determinePartSize(fileParameters.fileSize);
        const expectedNumParts = Math.ceil(fileParameters.fileSize / partSize);
        const partProgressArray = Array(expectedNumParts).fill(0);

        // Several parts can fail at once: abort the server-side upload only once.
        let serverAborted = false;
        const abortServerUpload = async () => {
            if (serverAborted) return;
            serverAborted = true;
            await abortMultipartUpload({ uploadId, fileId });
        };

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
                await abortServerUpload();
                return;
            }
            uploadPromises.push(
                uploadPart(uploadUrl, parts, chunk, i, abortControllerRef.current ?? new AbortController(), (partProgress) => {
                    partProgressArray[i - 1] = partProgress;

                    const overallProgress = (partProgressArray.reduce((sum, value) => sum + value, 0) / expectedNumParts);
                    setProgress(overallProgress);
                }).catch(async (error: unknown) => {
                    if (isCancelledRef.current) return; // Cancel button handles the rest
                    console.error("Failed to upload file", error);
                    handleUploadError(toFriendlyMessage(error, "The upload failed. Please try again."));
                    await abortServerUpload();
                })
            );
        }
        try {
            await Promise.all(uploadPromises);

        } catch (error: unknown) {
            console.error("Failed to upload file", error);
            await abortServerUpload();
            handleUploadError(toFriendlyMessage(error, "The upload failed. Please try again."));
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
        if (parts.length !== expectedNumParts) {
            // A part vanished (aborted mid-flight): do not complete a partial upload.
            handleUploadError("The upload was interrupted. Please try again.");
            await abortServerUpload();
            return;
        }
        const result: any = await completeMultipartUpload(completeMultipartUploadParameters);

        if (result.error) {
            handleUploadError(result.error);
            return;
        }
        finishUpload(fileId);
    }

    const handleUpload = async () => {
        if (selectedFile && selectedFile.name && selectedFile.size) {
            setUploaded(false);
            if (selectedFile.size > LARGE_FILE_MAX_SIZE) {
                handleUploadError(`The file is bigger than the max allowed file size (${MAX_FILE_SIZE_STRING})`);
                return;
            }
            setIsCancelled(false);
            isCancelledRef.current = false;
            abortControllerRef.current = new AbortController();
            setShareLink(null);
            uploadedFileNameRef.current = selectedFile.name;
            setUploading(true);

            const fileParameters: UploadFileParams = {
                fileName: selectedFile.name,
                folderId: folderId ?? "",
                // Some browsers report an empty MIME for uncommon types; the
                // server accepts a generic binary type, and uploads work.
                fileType: selectedFile.type || 'application/octet-stream',
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
            toast('Choose a file first, then press Upload.');
        }
    };

    const handleCancel = async () => {
        abortControllerRef.current?.abort();
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
        toast.success(`"${uploadedFileNameRef.current}" was uploaded`);
    }

    const handleGenerateDownloadLink = async () => {
        if (uploaded) {
            setGeneratingLink(true);
            const generateDownloadLinkParams: GenerateDownloadLinkParams = {
                fileId: fileIdRef.current,
                neverExpires: neverExpires,
                expiresAt: neverExpires ? null : expiryDate ? expiryDate : getNextWeekDate(),
            };
            const { link, error } = await generatePublicDownloadLink(generateDownloadLinkParams);
            if (error) {
                handleError(error)
                setGeneratingLink(false);
                return;
            }
            setShareLink(link);
            setGeneratingLink(false);
        }
    };

    const handleError = (error: string | null = null) => {
        const message: string = error ? error : 'Something went wrong. Please try again.';
        toast.error(message, { id: message });
    }

    const handleUploadError = (error: string | null = null) => {
        setUploading(false);
        setMultiPartUploading(false);
        setProgress(0);
        setUploaded(false);
        handleError(error);
    }

    const copyLink = async () => {
        if (!shareLink) return;
        if (await copyToClipboard(shareLink)) {
            setCopied(true);
            toast.success('Link copied to clipboard');
            setTimeout(() => setCopied(false), 2000);
        } else {
            toast('Copy failed — select the link text and copy it manually.');
        }
    };

    const reset = () => {
        setUploaded(false);
        setShareLink(null);
        setSelectedFile(null);
    };

    if (!folderId) return <NotFoundPage />;

    return (
        <div className="mx-auto w-full max-w-lg px-4 py-8">
            <div className="flex flex-col gap-5">
                <div className="flex items-center gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <FileUp className="size-5" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold sm:text-2xl">Upload a file</h1>
                        <p className="text-xs text-muted-foreground sm:text-sm">
                            Files up to {MAX_FILE_SIZE_STRING}. Big files upload in parallel parts.
                        </p>
                    </div>
                </div>

                {/* Drop zone / file picker */}
                {!uploading && !uploaded && (
                    <label
                        htmlFor="file-upload"
                        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={handleDrop}
                        className={cn(
                            "flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors",
                            dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-accent/30"
                        )}
                    >
                        {selectedFile ? (
                            <>
                                <span className="flex size-14 items-center justify-center rounded-xl bg-secondary">
                                    <FileIcon fileName={selectedFile.name} className="size-7" />
                                </span>
                                <span className="min-w-0">
                                    <span className="block truncate font-medium">{selectedFile.name}</span>
                                    <span className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</span>
                                </span>
                                <span className="text-xs text-muted-foreground">Drop another file to replace it</span>
                            </>
                        ) : (
                            <>
                                <span className="flex size-14 items-center justify-center rounded-xl bg-secondary">
                                    <Upload className="size-7 text-muted-foreground" />
                                </span>
                                <span>
                                    <span className="block font-medium">Drop a file here</span>
                                    <span className="text-sm text-muted-foreground">or click to choose one from your device</span>
                                </span>
                            </>
                        )}
                        <input
                            id="file-upload"
                            type="file"
                            className="sr-only"
                            onChange={handleFileChange}
                            disabled={uploading}
                        />
                    </label>
                )}

                {/* Progress */}
                {uploading && (
                    <div className="flex flex-col items-center gap-4 rounded-2xl border bg-card px-6 py-10">
                        <CircularProgressWithLabel value={progress} size={88} />
                        <p className="text-sm text-muted-foreground">
                            {multiPartUploading ? 'Uploading in parts…' : 'Uploading…'}
                        </p>
                        <Progress value={progress} className="w-full max-w-xs" />
                        <Button variant="secondary" size="sm" onClick={handleCancel}>
                            <X />
                            Cancel upload
                        </Button>
                    </div>
                )}

                {/* Actions for the chosen file */}
                {!uploading && !uploaded && selectedFile && (
                    <div className="flex gap-2">
                        <Button onClick={handleUpload} className="flex-1">
                            <Upload />
                            Upload
                        </Button>
                        <Button variant="ghost" onClick={() => setSelectedFile(null)}>
                            <X />
                            Clear
                        </Button>
                    </div>
                )}

                {/* Uploaded: public link options */}
                {uploaded && (
                    <div className="flex flex-col gap-4 rounded-2xl border bg-card px-5 py-6">
                        {shareLink ? (
                            <>
                                <div className="flex items-center gap-2 text-sm font-medium text-success">
                                    <CheckCircle2 className="size-5" />
                                    Your file is ready to share
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {neverExpires
                                        ? 'Anyone with this link can view the file, for as long as it exists.'
                                        : `Anyone with this link can view the file until it expires in ${expiryDays} day${expiryDays === 1 ? '' : 's'}.`}
                                </p>
                                <div className="flex flex-col gap-2 sm:flex-row">
                                    <input
                                        readOnly
                                        value={shareLink}
                                        aria-label="Public link"
                                        className="min-w-0 flex-1 truncate rounded-lg border border-input bg-transparent px-3 py-2 text-xs focus-visible:outline-none"
                                        onFocus={(event) => event.target.select()}
                                    />
                                    <Button onClick={copyLink} variant={copied ? 'secondary' : 'default'} className="shrink-0">
                                        {copied ? <CheckCircle2 /> : <Copy />}
                                        {copied ? 'Copied' : 'Copy link'}
                                    </Button>
                                </div>
                            </>
                        ) : generatingLink ? (
                            <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
                                <Loader2 className="animate-spin" />
                                Generating link…
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center gap-2 text-sm font-medium text-success">
                                    <CheckCircle2 className="size-5" />
                                    Uploaded successfully
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                    <Label htmlFor="never-expires" className="font-medium">Link never expires</Label>
                                    <Switch id="never-expires" checked={neverExpires} onCheckedChange={setNeverExpires} />
                                </div>
                                {!neverExpires && (
                                    <div className="flex flex-col gap-2">
                                        <Label>Link is valid for</Label>
                                        <Select value={String(expiryDays)} onValueChange={(value) => setExpiryDays(Number(value))}>
                                            <SelectTrigger className="w-full" aria-label="Link expiry">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {[1, 2, 3, 4, 5, 6, 7].map((days) => (
                                                    <SelectItem key={days} value={String(days)}>{days} day{days === 1 ? '' : 's'}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                                <div className="flex flex-col gap-2 sm:flex-row">
                                    <Button onClick={handleGenerateDownloadLink} className="flex-1">
                                        <LinkIcon />
                                        Generate public link
                                    </Button>
                                    <Button variant="secondary" onClick={() => navigate(`/user/folders/${folderId}`)}>
                                        Back to folder
                                    </Button>
                                </div>
                            </>
                        )}

                        <Button variant="ghost" onClick={reset} className="self-start text-muted-foreground">
                            <Upload />
                            Upload another file
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
export default UploadFile;
