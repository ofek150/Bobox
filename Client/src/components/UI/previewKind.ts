const CODE_EXTENSIONS = ['txt', 'md', 'json', 'js', 'ts', 'tsx', 'jsx', 'html', 'css', 'py', 'java', 'cs', 'go', 'rs', 'rb', 'php', 'sh', 'yml', 'yaml', 'xml', 'csv', 'log', 'ini', 'env', 'sql'];

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
