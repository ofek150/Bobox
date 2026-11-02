import React, { useEffect, useState } from 'react';
import {
    Download,
    ExternalLink,
    Eye,
    FolderInput,
    MoreVertical,
    Pencil,
    Share2,
    Trash2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import streamSaver from 'streamsaver';
import { toast } from 'sonner';

import { File, DownloadInfoParams, GenerateDownloadLinkParams, ShareFileParams, SharedFile } from '../utils/types';
import { ACCESS_LEVEL } from '../utils/constants';
import { formatFileSize } from '../utils/helpers';
import { generatePublicDownloadLink, getFileInfo, shareFileWithUserByEmail } from '../services/firebase';
import MoveToFileFolderDialog from './MoveFileOrFolderDialog';
import ConfirmDialog from './UI/ConfirmDialog';
import ShareDialog from './UI/ShareDialog';
import PreviewDialog, { previewKind } from './UI/PreviewDialog';
import { FileIcon } from './UI/FileTypeIcon';
import { useContextMenuGesture } from '../hooks/useContextMenuGesture';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface FileComponentProps {
    file: File;
    handleEditFileName: ((fileId: string, newFileName: string) => Promise<boolean>);
    handleDeleteFile: (fileId: string) => void;
    handleMoveFile: (fileId: string, currentFolderId: string, newFolderId: string) => void;
}

const FileComponent: React.FC<FileComponentProps> = ({
    file,
    handleEditFileName,
    handleDeleteFile,
    handleMoveFile,
}: FileComponentProps) => {
    const [fileNameWithoutExtension, setFileNameWithoutExtension] = useState('');
    const [displayedFileName, setDisplayedFileName] = useState(file.fileName);
    const [openEditDialog, setOpenEditDialog] = useState(false);
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [openMoveToFolderDialog, setOpenMoveToFolderDialog] = useState(false);
    const [openShareDialog, setOpenShareDialog] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [openPreviewDialog, setOpenPreviewDialog] = useState(false);
    const [previewFile, setPreviewFile] = useState<SharedFile | null>(null);
    const navigate = useNavigate();

    const fileExtension = file.fileName.split('.').pop();

    useEffect(() => {
        const parts = file.fileName.split('.');
        parts.pop(); // Remove the last element (file extension)
        setFileNameWithoutExtension(parts.join('.'));
    }, [file]);

    const fetchFileInfo = async (): Promise<SharedFile | null> => {
        const downloadInfoParams: DownloadInfoParams = {
            ownerUid: file.ownerUid,
            fileId: file.fileId,
            downloadId: file.privateLinkDownloadId,
        };
        try {
            const { fileInfo } = await getFileInfo(downloadInfoParams);
            return fileInfo;
        } catch (error: any) {
            toast.error(error.message || 'An error occurred while fetching file information.');
            return null;
        }
    };

    const downloadFile = async (fileInfo: SharedFile) => {
        if (!fileInfo?.downloadLink) return;
        setDownloading(true);
        try {
            const res = await fetch(fileInfo.downloadLink);
            if (!res || !res.body) throw new Error('Download failed');

            const fileStream = streamSaver.createWriteStream(fileInfo.fileName);
            const writer = fileStream.getWriter();
            const reader = res.body.getReader();

            const pump = async (): Promise<void> => {
                const { value, done } = await reader.read();
                if (done) {
                    writer.close();
                } else {
                    writer.write(value);
                    return writer.ready.then(pump);
                }
            };

            await pump();
        } catch (error: any) {
            toast.error(`An error occurred during the download: ${error.message}`);
        } finally {
            setDownloading(false);
        }
    };

    const handleDownloadClick = async () => {
        const fileDownloadInfo = await fetchFileInfo();
        if (fileDownloadInfo) await downloadFile(fileDownloadInfo);
    };

    const handlePreviewClick = async () => {
        if (!previewKind(file)) return;
        const info = await fetchFileInfo();
        if (info) {
            setPreviewFile(info);
            setOpenPreviewDialog(true);
        }
    };

    const handleItemClick = () => {
        navigate(`/user/${file.ownerUid}/files/${file.fileId}?downloadId=${file.privateLinkDownloadId}`);
    };

    const handleSaveClick = async () => {
        const updatedFileName = fileNameWithoutExtension + (fileExtension ? '.' + fileExtension : '');
        setOpenEditDialog(false);
        setDisplayedFileName(updatedFileName);
        if (!await handleEditFileName(file.fileId, updatedFileName)) {
            const parts = file.fileName.split('.');
            parts.pop();
            setFileNameWithoutExtension(parts.join('.'));
            setDisplayedFileName(file.fileName);
        }
    };

    const handleShareFile = async (email: string, accessLevel: ACCESS_LEVEL) => {
        const params: ShareFileParams = { email, fileId: file.fileId, accessLevel };
        const { success, error } = await shareFileWithUserByEmail(params);
        if (success) toast.success('User has been invited. Please check your email for the invitation.');
        else toast.error(`Error inviting user: ${error}`);
    };

    const handleGenerateLink = async (neverExpires: boolean, expiresAt: Date | null) => {
        const params: GenerateDownloadLinkParams = { fileId: file.fileId, neverExpires, expiresAt };
        return await generatePublicDownloadLink(params);
    };

    // Long-press (touch) / right-click (mouse) open the same row menu.
    const { bind: gesture, open: menuOpen, setOpen: setMenuOpen, pressed } = useContextMenuGesture();

    return (
        <>
            <div
                {...gesture}
                className={cn(
                    'flex touch-manipulation select-none items-center gap-2 rounded-xl border bg-card py-2 pr-1.5 pl-3 transition-[background-color,transform] duration-150 [-webkit-touch-callout:none] hover:bg-accent/50',
                    pressed && 'scale-[0.995] bg-accent active:bg-accent',
                    downloading && 'opacity-70'
                )}
            >
                <button
                    type="button"
                    onClick={handleItemClick}
                    className="flex min-w-0 flex-1 items-center gap-3 py-1.5 text-left"
                >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
                        <FileIcon fileName={file.fileName} className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                            <span className="truncate font-medium">{displayedFileName}</span>
                            {file.shared && (
                                <span className="shrink-0 rounded-md bg-chart-2/15 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-chart-2 uppercase">
                                    Shared
                                </span>
                            )}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                            {formatFileSize(file.fileSize)} · Uploaded {file.uploadedAt}
                        </span>
                    </span>
                </button>

                <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Download ${displayedFileName}`}
                    onClick={handleDownloadClick}
                    disabled={downloading}
                    className="hidden sm:inline-flex"
                >
                    <Download />
                </Button>

                <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
                    <DropdownMenuTrigger asChild>
                        <Button
                            data-no-gesture
                            variant="ghost"
                            size="icon"
                            aria-label={`More actions for ${displayedFileName}`}
                        >
                            <MoreVertical />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                        {previewKind(file) && (
                            <DropdownMenuItem onClick={handlePreviewClick}>
                                <Eye />
                                Preview
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={handleItemClick}>
                            <ExternalLink />
                            Open
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleDownloadClick}>
                            <Download />
                            Download
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setOpenEditDialog(true)}>
                            <Pencil />
                            Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setOpenMoveToFolderDialog(true)}>
                            <FolderInput />
                            Move to folder
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setOpenShareDialog(true)}>
                            <Share2 />
                            Share
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                            onClick={() => setOpenDeleteDialog(true)}
                        >
                            <Trash2 />
                            Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Rename dialog */}
            <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Rename file</DialogTitle>
                        <DialogDescription>Only the name changes; the file type stays the same.</DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="file-name">Name</Label>
                        <div className="flex items-center gap-2">
                            <Input
                                id="file-name"
                                autoFocus
                                value={fileNameWithoutExtension}
                                onChange={(event) => setFileNameWithoutExtension(event.target.value)}
                                onKeyDown={(event) => { if (event.key === 'Enter') handleSaveClick(); }}
                            />
                            {fileExtension && <span className="text-sm text-muted-foreground">.{fileExtension}</span>}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setOpenEditDialog(false)}>Cancel</Button>
                        <Button onClick={handleSaveClick} disabled={!fileNameWithoutExtension.trim()}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ShareDialog
                open={openShareDialog}
                onOpenChange={setOpenShareDialog}
                allowPublicLink
                onInvite={handleShareFile}
                onGenerateLink={handleGenerateLink}
            />

            <PreviewDialog
                open={openPreviewDialog}
                onOpenChange={setOpenPreviewDialog}
                fileInfo={previewFile}
                onDownload={handleDownloadClick}
            />

            <ConfirmDialog
                open={openDeleteDialog}
                onOpenChange={setOpenDeleteDialog}
                title="Delete file?"
                description={`"${displayedFileName}" will be permanently deleted. This cannot be undone.`}
                onConfirm={() => handleDeleteFile(file.fileId)}
            />

            <MoveToFileFolderDialog
                open={openMoveToFolderDialog}
                onClose={() => setOpenMoveToFolderDialog(false)}
                onMoveFile={handleMoveFile}
                file={file}
            />
        </>
    );
};

export default FileComponent;
