import React, { useState } from 'react';
import { ArrowLeft, Folder } from 'lucide-react';

import FolderComponent from './FolderComponent';
import { File, Folder as FolderType } from '../utils/types'
import { useFolderStructureContext } from '../contexts/FolderStructureContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface MoveToFileFolderDialogProps {
    open: boolean;
    file: File;
    onClose: () => void;
    onMoveFile: (fileId: string, currentFolderId: string, newFolderId: string) => void;
}

const MoveToFileFolderDialog: React.FC<MoveToFileFolderDialogProps> = ({ file, open, onClose, onMoveFile }) => {
    const [selectedFolderId, setSelectedFolderId] = useState("");
    const [shownFolderId, setShownFolderId] = useState("storage");
    const [shownFolderName, setShownFolderName] = useState("My Storage");
    const { getFolderWithId } = useFolderStructureContext();

    const handleFolderClick = (folderId: string) => {
        setSelectedFolderId(folderId);
    };

    const handleFolderDoubleClick = (folderId: string, folderName: string) => {
        setSelectedFolderId("");
        setShownFolderId(folderId);
        setShownFolderName(folderName);
    };

    const handleMoveFile = () => {
        if (!selectedFolderId) return;
        onMoveFile(file.fileId, file.parentFolderId, selectedFolderId);
        handleClose();
    };

    const handleClose = () => {
        onClose();
        setShownFolderId("storage");
        setShownFolderName("My Storage");
    };

    const goToFolder = (folderId: string) => {
        if (folderId === shownFolderId) return;
        if (folderId === "storage") {
            setShownFolderName("My Storage");
            setShownFolderId("storage");
            return;
        }
        const folder: FolderType = getFolderWithId(folderId);
        if (!folder) return;
        setShownFolderId(folderId);
        setShownFolderName(folder.folderName);
        setSelectedFolderId("");
    };

    const handleGoBack = () => {
        const folder: FolderType = getFolderWithId(shownFolderId);
        if (!folder) return;
        folder.folderId === "root" ? goToFolder("storage") : goToFolder(folder.parentFolderId);
    }

    const folderRowClass = (selected: boolean) =>
        cn(
            'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground',
            selected && 'bg-secondary text-secondary-foreground hover:bg-secondary'
        );

    return (
        <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}>
            <DialogContent className="max-h-[85vh] gap-4 sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {shownFolderId !== "storage" && (
                            <Button variant="ghost" size="icon" aria-label="Go back" onClick={handleGoBack}>
                                <ArrowLeft />
                            </Button>
                        )}
                        {shownFolderName}
                    </DialogTitle>
                </DialogHeader>

                <div className="min-h-0 flex-1 overflow-y-auto">
                    {shownFolderId === "storage" && (
                        <button
                            type="button"
                            className={folderRowClass(selectedFolderId === "root")}
                            onDoubleClick={() => handleFolderDoubleClick("root", "root")}
                            onClick={() => handleFolderClick("root")}
                        >
                            <Folder className="shrink-0" />
                            root
                        </button>
                    )}
                    {shownFolderId && shownFolderId != "storage" && <FolderComponent folderId={shownFolderId} selectFolder={true} onFolderClick={handleFolderClick} onFolderDoubleClick={handleFolderDoubleClick} />}
                </div>

                <DialogFooter>
                    <Button variant="secondary" onClick={handleClose}>Cancel</Button>
                    <Button onClick={handleMoveFile} disabled={!selectedFolderId}>
                        Move To Selected
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default MoveToFileFolderDialog;
