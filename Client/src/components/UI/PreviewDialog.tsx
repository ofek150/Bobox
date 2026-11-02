import React, { useEffect, useState } from 'react';
import { Download, FileQuestion, Loader2 } from 'lucide-react';

import { SharedFile } from '../../utils/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

const TEXT_LIMIT = 200_000; // characters of text files to show
const CODE_EXTENSIONS = ['txt', 'md', 'json', 'js', 'ts', 'tsx', 'jsx', 'html', 'css', 'py', 'java', 'cs', 'go', 'rs', 'rb', 'php', 'sh', 'yml', 'yaml', 'xml', 'csv', 'log', 'ini', 'env', 'sql'];

interface PreviewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** File metadata; the downloadLink is a presigned R2 URL. */
    fileInfo: SharedFile | null;
    onDownload?: () => void;
}

/** What the preview renderer can handle, by mime type and extension. */
export function previewKind(file: { fileName: string; fileType?: string }): 'image' | 'video' | 'audio' | 'pdf' | 'text' | null {
    const ext = file.fileName.split('.').pop()?.toLowerCase() ?? '';
    const type = file.fileType ?? '';
    if (type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif', 'bmp'].includes(ext)) return 'image';
    if (type.startsWith('video/') || ['mp4', 'webm', 'm4v', 'mov', 'mkv'].includes(ext)) return 'video';
    if (type.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(ext)) return 'audio';
    if (type === 'application/pdf' || ext === 'pdf') return 'pdf';
    if (type.startsWith('text/') || CODE_EXTENSIONS.includes(ext)) return 'text';
    return null;
}

/** In-app preview for images, video, audio, PDF and text/code files. */
const PreviewDialog: React.FC<PreviewDialogProps> = ({ open, onOpenChange, fileInfo, onDownload }) => {
    const [text, setText] = useState<string | null>(null);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [loadingText, setLoadingText] = useState(false);

    const kind = fileInfo ? previewKind(fileInfo) : null;

    useEffect(() => {
        setText(null);
        setPdfUrl(null);
        if (!open || !fileInfo?.downloadLink || !kind) return;

        if (kind === 'text') {
            setLoadingText(true);
            const link = fileInfo.downloadLink;
            fetch(link)
                .then((res) => {
                    if (!res.ok) throw new Error('fetch failed');
                    return res.text();
                })
                .then((body) => {
                    setText(body.length > TEXT_LIMIT ? body.slice(0, TEXT_LIMIT) + '\n\n… file truncated in preview …' : body);
                })
                .catch(() => toast.error('Could not load the preview for this file.'))
                .finally(() => setLoadingText(false));
        }

        if (kind === 'pdf') {
            // A PDF in an <iframe> needs a blob URL: remote presigned URLs send
            // content-disposition: attachment, which browsers refuse to frame.
            setLoadingText(true);
            const link = fileInfo.downloadLink;
            fetch(link)
                .then((res) => {
                    if (!res.ok) throw new Error('fetch failed');
                    return res.blob();
                })
                .then((blob) => setPdfUrl(URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }))))
                .catch(() => toast.error('Could not load the preview for this file.'))
                .finally(() => setLoadingText(false));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, fileInfo?.downloadLink]);

    // Release the blob URL when the dialog closes.
    useEffect(() => {
        if (!open && pdfUrl) URL.revokeObjectURL(pdfUrl);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="gap-4 sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle className="pr-8 break-all">{fileInfo?.fileName}</DialogTitle>
                    <DialogDescription className="sr-only">File preview</DialogDescription>
                </DialogHeader>

                <div className="-mx-4 min-h-40 overflow-x-hidden overflow-y-auto px-4 sm:mx-0 sm:px-0">
                    {kind === 'image' && fileInfo?.downloadLink && (
                        <img
                            src={fileInfo.downloadLink}
                            alt={fileInfo.fileName}
                            className="mx-auto max-h-[65vh] w-auto max-w-full rounded-lg object-contain"
                        />
                    )}
                    {kind === 'video' && fileInfo?.downloadLink && (
                        <video
                            src={fileInfo.downloadLink}
                            controls
                            className="mx-auto max-h-[65vh] w-full max-w-2xl rounded-lg bg-black"
                        />
                    )}
                    {kind === 'audio' && fileInfo?.downloadLink && (
                        <div className="flex flex-col items-center gap-4 py-8">
                            <audio src={fileInfo.downloadLink} controls className="w-full max-w-md" />
                        </div>
                    )}
                    {kind === 'pdf' && (
                        loadingText ? (
                            <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="animate-spin" /></div>
                        ) : pdfUrl ? (
                            <iframe src={pdfUrl} title={fileInfo?.fileName} className="h-[65vh] w-full rounded-lg border" />
                        ) : null
                    )}
                    {kind === 'text' && (
                        loadingText ? (
                            <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="animate-spin" /></div>
                        ) : text !== null ? (
                            <pre className="max-h-[65vh] overflow-auto rounded-lg bg-muted/50 p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap">{text}</pre>
                        ) : null
                    )}
                    {!kind && (
                        <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
                            <FileQuestion className="size-10" />
                            <p className="text-sm">No in-app preview for this file type.</p>
                        </div>
                    )}
                </div>

                {onDownload && (
                    <div className="flex justify-end">
                        <Button variant="secondary" size="sm" onClick={onDownload}>
                            <Download />
                            Download
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default PreviewDialog;
