import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    List,
    ListItem,
    ListItemText
} from '@mui/material';
import FolderComponent from './FolderComponent';
import { File, Folder } from '../utils/types'
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FolderIcon from "@mui/icons-material/Folder";
import { useFolderStructureContext } from '../contexts/FolderStructureContext';

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
        const folder: Folder = getFolderWithId(folderId);
        if (!folder) return;
        setShownFolderId(folderId);
        setShownFolderName(folder.folderName);
        setSelectedFolderId("");
    };

    const handleGoBack = () => {
        const folder: Folder = getFolderWithId(shownFolderId);
        if (!folder) return;
        folder.folderId === "root" ? goToFolder("storage") : goToFolder(folder.parentFolderId);
    }

    return (
        <Dialog open={open} onClose={handleClose}>
            <DialogTitle>
                {shownFolderId !== "storage" &&
                    <ArrowBackIcon
                        style={{ cursor: 'pointer', marginRight: '8px' }}
                        onClick={handleGoBack} />
                }
                {shownFolderName}
            </DialogTitle>
            <DialogContent>
                <List>
                    {shownFolderId === "storage" &&
                        <ListItem key={"root"} selected={selectedFolderId === "root"}
                            onDoubleClick={() => handleFolderDoubleClick("root", "root")}
                            onClick={() => handleFolderClick("root")}
                            sx={{
                                ':hover': {
                                    backgroundColor: '#e0e0e0', // Change the background color on hover
                                },
                            }}
                        >
                            <FolderIcon style={{ marginRight: "8px" }} />
                            <ListItemText primary={"root"} />

                        </ListItem>
                    }
                    {shownFolderId && shownFolderId != "storage" && <FolderComponent folderId={shownFolderId} selectFolder={true} onFolderClick={handleFolderClick} onFolderDoubleClick={handleFolderDoubleClick} />}
                </List>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} color="secondary">Cancel</Button>
                <Button onClick={handleMoveFile} color="primary">
                    Move To Selected
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default MoveToFileFolderDialog;
