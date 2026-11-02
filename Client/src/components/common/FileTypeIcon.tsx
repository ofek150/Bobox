import {
    Archive,
    AudioWaveform,
    Code,
    File,
    FileText,
    Image,
    Presentation,
    Sheet,
    Video,
    Folder as FolderIcon,
    FolderOpen,
    FolderUsers,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileIconProps {
    fileName: string;
    className?: string;
}

const EXTENSIONS: Array<{ icon: React.ComponentType<{ className?: string }>; tone: string; exts: string[] }> = [
    { icon: Image, tone: 'text-chart-3', exts: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif', 'bmp'] },
    { icon: Video, tone: 'text-chart-5', exts: ['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v'] },
    { icon: AudioWaveform, tone: 'text-chart-4', exts: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'] },
    { icon: FileText, tone: 'text-chart-1', exts: ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'md'] },
    { icon: Sheet, tone: 'text-chart-3', exts: ['xls', 'xlsx', 'csv', 'numbers', 'ods'] },
    { icon: Presentation, tone: 'text-chart-5', exts: ['ppt', 'pptx', 'key', 'odp'] },
    { icon: Archive, tone: 'text-chart-4', exts: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'] },
    { icon: Code, tone: 'text-chart-2', exts: ['js', 'ts', 'tsx', 'jsx', 'json', 'html', 'css', 'py', 'java', 'cs', 'go', 'rs', 'rb', 'php', 'sh'] },
];

/** Colour-coded icon for a file, chosen by its extension. */
export function FileIcon({ fileName, className }: FileIconProps) {
    const extension = fileName.split('.').pop()?.toLowerCase() ?? '';
    const match = EXTENSIONS.find((entry) => entry.exts.includes(extension));
    const Icon = match?.icon ?? File;

    return <Icon aria-hidden="true" className={cn('shrink-0', match?.tone ?? 'text-muted-foreground', className)} />;
}

interface FolderIconProps {
    shared?: boolean;
    className?: string;
}

/** Folder icon, tinted when the folder is shared with collaborators. */
export function FolderIconBadge({ shared, className }: FolderIconProps) {
    const Icon = shared ? FolderUsers : FolderIcon;
    return <Icon aria-hidden="true" className={cn('shrink-0', shared ? 'text-chart-2' : 'text-chart-4', className)} />;
}

export { FolderOpen };
