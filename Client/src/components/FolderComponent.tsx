import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FolderInput, MoreVertical, Pencil, Share2, Trash2, FolderPlus, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { Folder, File, ShareFolderParams } from '../utils/types';
import { ACCESS_LEVEL, FILTER_ITEMS_TYPE, SORT_TYPE, ITEM_TYPE } from '../utils/constants';
import { shareFolderWithUserByEmail } from '../services/firebase';
import { useFolderStructureContext } from '../contexts/FolderStructureContext';
import FileComponent from './FileComponent';
import NotFoundPage from '../pages/NotFoundPage';
import ConfirmDialog from './UI/ConfirmDialog';
import ShareDialog from './UI/ShareDialog';
import FilterBar from './UI/FilterBar';
import { FolderIconBadge } from './UI/FileTypeIcon';
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
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface FolderComponentProps {
    folderId: string;
    handleEditFileName?: (fileId: string, newFileName: string) => Promise<boolean>;
    handleDeleteFile?: (fileId: string) => void;
    handleMoveFile?: (fileId: string, currentFolderId: string, newFolderId: string) => void;
    handleEditFolderName?: (folderId: string, newFolderName: string) => void;
    handleDeleteFolder?: (folderId: string) => void;
    onFolderClick?: (folderId: string) => void;
    onFolderDoubleClick?: (folderId: string, folderName: string) => void;
    selectFolder: boolean;
    onUploadClick?: () => void;
    onCreateFolderClick?: () => void;
}

type ListItemEntry =
    | { type: ITEM_TYPE.FOLDER; key: string; name: string; date: string | null; data: Folder }
    | { type: ITEM_TYPE.FILE; key: string; name: string; date: string | null; data: File };

/** Dates arrive as "DD/MM/YYYY"; this makes them sortable as strings. */
const toSortableDate = (value: string | null): string => {
    if (!value) return '';
    const parts = value.split('/');
    return parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : value;
};

/**
 * One folder row. A component (not inline JSX in the list map) so it can own
 * its context-menu gesture state: long-press (touch) / right-click (mouse)
 * open the same actions menu as the kebab button.
 */
interface FolderRowProps {
    name: string;
    shared?: boolean;
    ownerUid?: string;
    date?: string | null;
    onOpen: () => void;
    onActions: (action: 'rename' | 'share' | 'delete') => void;
}

const FolderRow: React.FC<FolderRowProps> = ({ name, shared, ownerUid, date, onOpen, onActions }) => {
    const { bind, open, setOpen, pressed } = useContextMenuGesture();

    return (
        <div
            {...bind}
            className={cn(
                'flex touch-manipulation select-none items-center gap-2 rounded-xl border bg-card py-2 pr-1.5 pl-3 transition-[background-color,transform] duration-150 [-webkit-touch-callout:none] hover:bg-accent/50',
                pressed && 'scale-[0.995] bg-accent active:bg-accent'
            )}
        >
            <button
                type="button"
                onClick={onOpen}
                className="flex min-w-0 flex-1 items-center gap-3 py-1.5 text-left"
            >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
                    <FolderIconBadge shared={shared} className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                        <span className="truncate font-medium">{name}</span>
                        {shared && (
                            <span className="shrink-0 rounded-md bg-chart-2/15 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-chart-2 uppercase">
                                Shared
                            </span>
                        )}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                        {date ? `Created ${date}` : 'Shared with you'}
                    </span>
                </span>
            </button>

            {/* Collaborators cannot rename or delete folders they don't own. */}
            {ownerUid && (
                <DropdownMenu open={open} onOpenChange={setOpen}>
                    <DropdownMenuTrigger asChild>
                        <Button data-no-gesture variant="ghost" size="icon" aria-label={`More actions for ${name}`}>
                            <MoreVertical />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuItem onClick={onOpen}>
                            <FolderInput />
                            Open
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onActions('rename')}>
                            <Pencil />
                            Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onActions('share')}>
                            <Share2 />
                            Share
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                            onClick={() => onActions('delete')}
                        >
                            <Trash2 />
                            Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
        </div>
    );
};

const FolderComponent: React.FC<FolderComponentProps> = ({
    folderId,
    handleEditFileName,
    handleEditFolderName,
    handleDeleteFile,
    handleDeleteFolder,
    selectFolder,
    handleMoveFile,
    onFolderClick,
    onFolderDoubleClick,
    onUploadClick,
    onCreateFolderClick,
}: FolderComponentProps) => {
    const navigate = useNavigate();
    const { folderStructure, getFolderWithId } = useFolderStructureContext();
    const [loading, setLoading] = useState(true);
    const [folder, setFolder] = useState<Folder | null>(null);
    const [invalidFolderId, setInvalidFolderId] = useState(false);
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

    const [openEditDialog, setOpenEditDialog] = useState(false);
    const [openShareDialog, setOpenShareDialog] = useState(false);
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [targetFolderId, setTargetFolderId] = useState<string | null>(null);
    const [currFolderName, setCurrFolderName] = useState("");

    const [sortType, setSortType] = useState<SORT_TYPE>(SORT_TYPE.BY_DATE_DESC);
    const [filterItemType, setFilterItemType] = useState<FILTER_ITEMS_TYPE>(FILTER_ITEMS_TYPE.BOTH);

    useEffect(() => {
        if (!folderId) return;
        const found = getFolderWithId(folderId);
        if (!found) {
            setInvalidFolderId(true);
            return;
        }
        setFolder(found);
        setInvalidFolderId(false);
    }, [folderId, folderStructure, getFolderWithId]);

    useEffect(() => {
        if (folder) setLoading(false);
    }, [folder]);

    const items = useMemo<ListItemEntry[]>(() => {
        if (!folder) return [];

        // getFolderWithId returns the enriched node: fileObjects / folderObjects.
        const enriched = folder as unknown as { fileObjects?: File[]; folderObjects?: Folder[] };
        const folders = enriched.folderObjects ?? [];
        const files = enriched.fileObjects ?? [];

        const entries: ListItemEntry[] = [
            ...folders.map((entry): ListItemEntry => ({
                type: ITEM_TYPE.FOLDER,
                key: entry.folderId,
                name: entry.folderName,
                date: entry.createdAt,
                data: entry,
            })),
            ...files.map((entry): ListItemEntry => ({
                type: ITEM_TYPE.FILE,
                key: entry.fileId,
                name: entry.fileName,
                date: entry.uploadedAt,
                data: entry,
            })),
        ];

        const visible = entries.filter((entry) => {
            if (selectFolder) return entry.type === ITEM_TYPE.FOLDER;
            if (filterItemType === FILTER_ITEMS_TYPE.FOLDERS_ONLY) return entry.type === ITEM_TYPE.FOLDER;
            if (filterItemType === FILTER_ITEMS_TYPE.FILES_ONLY) return entry.type === ITEM_TYPE.FILE;
            return true;
        });

        const byName = (a: ListItemEntry, b: ListItemEntry) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
        const byDate = (a: ListItemEntry, b: ListItemEntry) => toSortableDate(a.date).localeCompare(toSortableDate(b.date));

        switch (sortType) {
            case SORT_TYPE.BY_NAME_ASC: visible.sort(byName); break;
            case SORT_TYPE.BY_NAME_DESC: visible.sort((a, b) => -byName(a, b)); break;
            case SORT_TYPE.BY_DATE_ASC: visible.sort(byDate); break;
            case SORT_TYPE.BY_DATE_DESC: visible.sort((a, b) => -byDate(a, b)); break;
        }

        return visible;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [folder, folderStructure, filterItemType, sortType, selectFolder]);

    const handleShareFolder = async (email: string, accessLevel: ACCESS_LEVEL) => {
        if (!targetFolderId) return;
        const params: ShareFolderParams = { email, folderId: targetFolderId, accessLevel };
        const { success, error } = await shareFolderWithUserByEmail(params);
        if (success) toast.success('User has been invited. Please check your email for the invitation.');
        else toast.error(`Error inviting user: ${error}`);
    };

    const openFolderActions = (id: string, name: string, action: 'rename' | 'share' | 'delete') => {
        setTargetFolderId(id);
        setCurrFolderName(name);
        if (action === 'rename') setOpenEditDialog(true);
        if (action === 'share') setOpenShareDialog(true);
        if (action === 'delete') setOpenDeleteDialog(true);
    };

    const handleSaveClick = () => {
        if (!targetFolderId) return;
        handleEditFolderName?.(targetFolderId, currFolderName);
        setOpenEditDialog(false);
        setCurrFolderName("");
        setTargetFolderId(null);
    };

    const handleFolderSelectClick = (clickedFolderId: string) => {
        setSelectedFolderId(clickedFolderId);
        onFolderClick?.(clickedFolderId);
    };

    if (invalidFolderId) return <NotFoundPage />;
    if (loading || !folder) {
        return (
            <div className="stagger-in flex flex-col gap-2 p-1">
                {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
            </div>
        );
    }

    const isVirtual = folder.folderId === 'root' || folder.folderId === 'shared';
    const title = folder.folderId === 'root' ? 'My Storage' : folder.folderId === 'shared' ? 'Shared Storage' : folder.folderName;

    // Picker mode (used by "move to folder"): plain selectable rows.
    if (selectFolder) {
        const pickerFolders = items
            .filter((item) => item.type === ITEM_TYPE.FOLDER)
            .map((item) => { const data = item.data as Folder; return { id: data.folderId, name: data.folderName, shared: data.shared }; });
        return (
            <div className="flex flex-col gap-1">
                {pickerFolders.map((entry) => (
                    <button
                        key={entry.id}
                        type="button"
                        onClick={() => handleFolderSelectClick(entry.id)}
                        onDoubleClick={() => onFolderDoubleClick?.(entry.id, entry.name)}
                        className={cn(
                            'flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-sm hover:bg-accent hover:text-accent-foreground',
                            selectedFolderId === entry.id && 'bg-secondary text-secondary-foreground hover:bg-secondary'
                        )}
                    >
                        <FolderIconBadge shared={entry.shared} className="size-5" />
                        <span className="truncate font-medium">{entry.name}</span>
                    </button>
                ))}
                {items.length === 0 && (
                    <p className="px-2 py-6 text-center text-sm text-muted-foreground">No folders here</p>
                )}
            </div>
        );
    }

    return (
        <div className="flex w-full flex-col gap-4">
            <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                    {!isVirtual && (
                        <Button variant="ghost" size="icon" aria-label="Go back" onClick={() => navigate(-1)}>
                            <ArrowLeft />
                        </Button>
                    )}
                    <div className="min-w-0">
                        <h1 className="truncate text-xl font-bold sm:text-2xl">{title}</h1>
                        <p className="text-xs text-muted-foreground sm:text-sm">
                            {items.length} {items.length === 1 ? 'item' : 'items'}
                        </p>
                    </div>
                </div>

                <FilterBar setType={setFilterItemType} setSortBy={setSortType} sortBy={sortType} filterType={filterItemType} />
            </div>

            <div className="stagger-in flex flex-col gap-2">
                {items.map((item) =>
                    item.type === ITEM_TYPE.FOLDER ? (
                        <FolderRow
                            key={item.key}
                            name={item.name}
                            shared={(item.data as Folder).shared}
                            ownerUid={(item.data as Folder).ownerUid}
                            date={item.date}
                            onOpen={() => navigate(`/user/folders/${item.data.folderId}`)}
                            onActions={(action) => openFolderActions(item.data.folderId, item.name, action)}
                        />
                    ) : (
                        <FileComponent
                            key={item.key}
                            file={item.data as File}
                            handleEditFileName={handleEditFileName!}
                            handleDeleteFile={handleDeleteFile!}
                            handleMoveFile={handleMoveFile!}
                        />
                    )
                )}

                {items.length === 0 && (
                    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center">
                        <p className="text-sm font-medium">This folder is empty</p>
                        <p className="max-w-sm text-sm text-muted-foreground">
                            Upload files to keep them here, or create a folder to stay organized.
                        </p>
                        <div className="hidden flex-wrap justify-center gap-2 sm:flex">
                            {onUploadClick && (
                                <Button onClick={onUploadClick}>
                                    <Upload />
                                    Upload files
                                </Button>
                            )}
                            {onCreateFolderClick && (
                                <Button variant="secondary" onClick={onCreateFolderClick}>
                                    <FolderPlus />
                                    New folder
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Rename dialog */}
            <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Rename folder</DialogTitle>
                        <DialogDescription>Everyone you share it with will see the new name.</DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="folder-name">Name</Label>
                        <Input
                            id="folder-name"
                            autoFocus
                            value={currFolderName}
                            onChange={(event) => setCurrFolderName(event.target.value)}
                            onKeyDown={(event) => { if (event.key === 'Enter') handleSaveClick(); }}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setOpenEditDialog(false)}>Cancel</Button>
                        <Button onClick={handleSaveClick} disabled={!currFolderName.trim()}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ShareDialog
                open={openShareDialog}
                onOpenChange={setOpenShareDialog}
                onInvite={handleShareFolder}
            />

            <ConfirmDialog
                open={openDeleteDialog}
                onOpenChange={setOpenDeleteDialog}
                title="Delete folder?"
                description={`"${currFolderName}" and everything inside it will be deleted. This cannot be undone.`}
                onConfirm={() => targetFolderId && handleDeleteFolder?.(targetFolderId)}
            />
        </div>
    );
};

export default FolderComponent;
