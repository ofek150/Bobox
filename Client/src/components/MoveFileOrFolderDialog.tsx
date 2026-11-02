import React, { useMemo, useState } from 'react';
import { ArrowLeft, ChevronRight, FolderInput } from 'lucide-react';

import { File, Folder as FolderType } from '../utils/types'
import { useFolderStructureContext } from '../contexts/FolderStructureContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FolderIconBadge } from './common/FileTypeIcon';
import { cn } from '@/lib/utils';

interface MoveToFileFolderDialogProps {
    open: boolean;
    file: File;
    onClose: () => void;
    onMoveFile: (fileId: string, currentFolderId: string, newFolderId: string) => void;
}

interface Crumb {
    folderId: string;
    folderName: string;
}

/**
 * Folder picker for moving a file. iOS-style: every row is a folder you can
 * open, and the file moves to the folder you are currently inside. A clickable
 * breadcrumb above the list shows the full path and jumps back to any level.
 * Only one depth is ever rendered; the whole tree is already in the client
 * cache, so navigation needs no loading state.
 */
const MoveToFileFolderDialog: React.FC<MoveToFileFolderDialogProps> = ({ file, open, onClose, onMoveFile }) => {
    const { getFolderWithId } = useFolderStructureContext();
    const [shownFolderId, setShownFolderId] = useState('root');

    const handleClose = () => {
        setShownFolderId('root');
        onClose();
    };

    // Walk the parent chain for the breadcrumb (same pattern as PathBar).
    const path: Crumb[] = useMemo(() => {
        const chain: Crumb[] = [];
        let id: string | undefined = shownFolderId;
        while (id) {
            const folder = getFolderWithId(id) as FolderType | null;
            if (!folder) break;
            chain.unshift({
                folderId: folder.folderId,
                folderName: folder.folderId === 'root' ? 'My Storage' : folder.folderName,
            });
            id = folder.parentFolderId && folder.parentFolderId !== folder.folderId ? folder.parentFolderId : undefined;
        }
        return chain;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [shownFolderId, open]);

    // Children of the current folder only - one depth at a time.
    const subfolders: FolderType[] = useMemo(() => {
        const node = getFolderWithId(shownFolderId) as (FolderType & { folderObjects?: FolderType[] }) | null;
        const kids = node?.folderObjects ?? [];
        return kids
            .filter((kid) => kid.folderId !== 'shared')
            .sort((a, b) => a.folderName.localeCompare(b.folderName, undefined, { sensitivity: 'base' }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [shownFolderId, open]);

    const currentName = path.length > 0 ? path[path.length - 1].folderName : 'My Storage';
    const alreadyHere = file.parentFolderId === shownFolderId;

    const goToFolder = (folderId: string) => setShownFolderId(folderId);

    const handleGoBack = () => {
        const parent = getFolderWithId(shownFolderId)?.parentFolderId;
        if (parent && parent !== shownFolderId) goToFolder(parent);
    };

    const handleMove = () => {
        if (alreadyHere) return;
        onMoveFile(file.fileId, file.parentFolderId, shownFolderId);
        handleClose();
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}>
            <DialogContent className="flex max-h-[85vh] flex-col gap-4 sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="truncate">Move “{file.fileName}”</DialogTitle>
                    <DialogDescription>Open a folder, then move the file there.</DialogDescription>
                </DialogHeader>

                {/* Full path; every level is clickable to jump back. */}
                <div className="flex min-w-0 items-center gap-1">
                    {path.length > 1 && (
                        <Button variant="ghost" size="icon" className="size-7 shrink-0" aria-label="Go up one folder" onClick={handleGoBack}>
                            <ArrowLeft />
                        </Button>
                    )}
                    <nav aria-label="Folder path" className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto rounded-lg bg-muted/60 px-2 py-1.5 text-sm [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {path.map((crumb, i) => (
                            <React.Fragment key={crumb.folderId}>
                                {i > 0 && <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />}
                                <button
                                    type="button"
                                    onClick={() => goToFolder(crumb.folderId)}
                                    aria-current={i === path.length - 1 ? 'page' : undefined}
                                    className={cn(
                                        'shrink-0 rounded-md px-1.5 py-0.5 hover:bg-accent',
                                        i === path.length - 1 ? 'font-semibold' : 'text-muted-foreground hover:text-foreground'
                                    )}
                                >
                                    {crumb.folderName}
                                </button>
                            </React.Fragment>
                        ))}
                    </nav>
                </div>

                <div className="stagger-in -mr-1 min-h-24 flex-1 space-y-2 overflow-y-auto pr-1">
                    {subfolders.map((sub) => (
                        <button
                            key={sub.folderId}
                            type="button"
                            onClick={() => goToFolder(sub.folderId)}
                            className="flex w-full items-center gap-3 rounded-xl border bg-card px-3 py-2.5 text-left transition-colors hover:bg-accent/50 active:bg-accent"
                        >
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
                                <FolderIconBadge shared={sub.shared} className="size-4.5" />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="flex items-center gap-1.5">
                                    <span className="truncate text-sm font-medium">{sub.folderName}</span>
                                    {sub.shared && (
                                        <span className="shrink-0 rounded-md bg-chart-2/15 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-chart-2 uppercase">
                                            Shared
                                        </span>
                                    )}
                                </span>
                            </span>
                            <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        </button>
                    ))}
                    {subfolders.length === 0 && (
                        <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                            No folders in “{currentName}” — you can move the file here.
                        </p>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={handleClose}>Cancel</Button>
                    <Button onClick={handleMove} disabled={alreadyHere}>
                        <FolderInput />
                        {alreadyHere ? 'Already in this folder' : `Move to “${currentName}”`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default MoveToFileFolderDialog;
