import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFolderStructureContext } from '../contexts/FolderStructureContext';
import { Folder, File } from '../utils/types';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, List, ListItem, ListItemSecondaryAction, ListItemText, TextField } from '@mui/material';
import Loading from './Loading';
import FileComponent from './FileComponent';
import EditIcon from '@mui/icons-material/Edit';

interface FolderComponentProps {
    folderId: string;
    navigateToFileInfo?: (fileId: string) => void;
    handleEditFileName?: (fileId: string, newFileName: string) => void;
    handleDeleteFile?: (fileId: string) => void;
    handleMoveFile?: (fileId: string, currentFolderId: string, newFolderId: string) => void;
    handleEditFolderName: (folderId: string, newFolderName: string) => void;
    onFolderClick?: (folderId: string) => void;
    onFolderDoubleClick?: (folderId: string, folderName: string) => void;
    selectFolder: boolean;
}

const FolderComponent: React.FC<FolderComponentProps> = ({ folderId, navigateToFileInfo, handleEditFileName, handleEditFolderName, handleDeleteFile, selectFolder, handleMoveFile, onFolderClick, onFolderDoubleClick }: FolderComponentProps) => {
    const navigate = useNavigate();
    const { folderStructure, getFolderWithId } = useFolderStructureContext();
    const [loading, setLoading] = useState(true);
    const [folder, setFolder] = useState<any>(null);
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
    const [openEditDialog, setOpenEditDialog] = useState(false);
    const [currFolderName, setCurrFolderName] = useState("");
    const [isEditing, setEditing] = useState(false);

    useEffect(() => {
        if (folderId) setFolder(getFolderWithId(folderId));
    }, [folderId, folderStructure]);

    useEffect(() => {
        if (folderId) setLoading(false);
    }, [folder]);

    const handleEditClick = (folderId: string) => {
        console.log("Folder id: ", folderId);
        const selectedFolder: Folder = getFolderWithId(folderId);
        if (!selectedFolder) return;
        setCurrFolderName(selectedFolder.folderName);
        setSelectedFolderId(folderId);
        setOpenEditDialog(true);
    };

    const handleSaveClick = () => {
        setEditing(false);
        if (!selectedFolderId) return;
        handleEditFolderName(selectedFolderId, currFolderName);
        setOpenEditDialog(false);
        setCurrFolderName("");
        setSelectedFolderId("");
    };


    const handleCancelClick = () => {
        setEditing(false);
        setOpenEditDialog(false);
        setCurrFolderName("");
        setSelectedFolderId("");
    };

    const handleDialogInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCurrFolderName(e.target.value);
    };

    const handleFolderClick = (clickedFolderId: string) => {
        setSelectedFolderId(clickedFolderId);
        onFolderClick && onFolderClick(clickedFolderId);
    };

    const handleFolderDoubleClick = (doubleClickedFolderId: string, doubleClickedFolderName: string) => {
        onFolderDoubleClick && onFolderDoubleClick(doubleClickedFolderId, doubleClickedFolderName);
    };


    const renderFolderList = (head: { [key: string]: any }) => {
        const items: JSX.Element[] = [];

        const folders: any = Array.from(head.folderObjects.values());
        const files: any = Array.from(head.fileObjects.values());

        // Sort folders by createdAt
        const sortedFolders = folders.filter((folder: Folder) => folder.createdAt)
            .sort((a: Folder, b: Folder) => a.createdAt!.localeCompare(b.createdAt!));

        // Add folders to the list
        sortedFolders.forEach((folder: Folder) => {
            items.push(selectFolder ? (
                <ListItem key={folder.folderId} selected={selectedFolderId === folder.folderId}
                    onDoubleClick={() => handleFolderDoubleClick(folder.folderId, folder.folderName)}
                    onClick={() => handleFolderClick(folder.folderId)}
                    sx={{
                        ':hover': {
                            backgroundColor: '#e0e0e0', // Change the background color on hover
                        },
                    }}
                >
                    <ListItemText primary={folder.folderName} />
                </ListItem>
            ) : (
                <ListItem key={folder.folderId} button onClick={() => navigate(`/user/folders/${folder.folderId}`)}>
                    <ListItemText primary={folder.folderName} secondary={`Created at: ${folder.createdAt}`} sx={{ mr: 10 }} />
                    <ListItemSecondaryAction>
                        <IconButton edge="end" aria-label="Edit" onClick={() => handleEditClick(folder.folderId)}>
                            <EditIcon />
                        </IconButton>
                    </ListItemSecondaryAction>
                </ListItem>
            ));
        });

        //If in folder selection mode there's no need to render the filess
        if (selectFolder) return items;

        // Sort files by uploadedAt
        const sortedFiles = files.filter((file: File) => file.uploadedAt)
            .sort((a: File, b: File) => a.uploadedAt!.localeCompare(b.uploadedAt!));

        // Add files to the list
        sortedFiles.forEach((file: File) => {
            items.push(
                <FileComponent key={file.fileId} file={file} navigateToFileInfo={navigateToFileInfo || (() => { })} onEditFileName={handleEditFileName || (() => { })} onDeleteFile={handleDeleteFile || (() => { })} onMoveFile={handleMoveFile || (() => { })} />
            );
        });

        return items;
    };

    if (loading) {
        return <Loading />;
    }

    return (
        <>
            <List>
                {renderFolderList(folder)}
            </List>
            <Dialog open={openEditDialog} onClose={handleCancelClick}>
                <DialogTitle>Edit Folder Name</DialogTitle>
                <DialogContent>
                    <TextField
                        value={currFolderName}
                        onChange={handleDialogInputChange}
                        autoFocus
                        fullWidth
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleSaveClick} color="primary">
                        Save
                    </Button>
                    <Button onClick={handleCancelClick} color="secondary">
                        Cancel
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default FolderComponent;
