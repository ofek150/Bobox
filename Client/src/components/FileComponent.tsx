import React, { useEffect, useState } from 'react';
import { ListItem, ListItemText, ListItemSecondaryAction, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from "@mui/material";
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DriveFileMove from '@mui/icons-material/DriveFileMove';
import { formatFileSize } from "../utils/helpers";
import { File } from "../utils/types";
import MoveToFileFolderDialog from './MoveFileOrFolderDialog';

interface FileComponentProps {
    file: File;
    navigateToFileInfo: (fileId: string) => void;
    onEditFileName: (fileId: string, newFileName: string) => void;
    onDeleteFile: (fileId: string) => void;
    onMoveFile: (fileId: string, currentFolderId: string, newFolderId: string) => void;
}

const FileComponent: React.FC<FileComponentProps> = ({ file, navigateToFileInfo, onEditFileName, onDeleteFile, onMoveFile }: FileComponentProps) => {
    const [isEditing, setEditing] = useState(false);
    const [fileNameWithoutExtension, setFileNameWithoutExtension] = useState("");
    const [openEditDialog, setOpenEditDialog] = useState(false);
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [openMoveToFolderDialog, setOpenMoveToFolderDialog] = useState(false);

    const fileExtension = file.fileName.split('.').pop();

    useEffect(() => {
        const parts = file.fileName.split('.');
        // Remove the last element (file extension)
        parts.pop();
        setFileNameWithoutExtension(parts.join('.'));
    }, [file]);

    useEffect(() => {
    }, [fileNameWithoutExtension]);


    const handleEditClick = () => {
        setOpenEditDialog(true);
    };

    const handleSaveClick = () => {
        setEditing(false);
        const updatedFileName = fileNameWithoutExtension + (fileExtension ? '.' + fileExtension : "");
        onEditFileName(file.fileId, updatedFileName);
        setOpenEditDialog(false);
    };


    const handleCancelClick = () => {
        setEditing(false);
        setFileNameWithoutExtension(file.fileName);
        setOpenEditDialog(false);
    };

    const handleDeleteClick = () => {
        setOpenDeleteDialog(true);
    };

    const handleDeleteConfirmation = () => {
        onDeleteFile(file.fileId);
        setOpenDeleteDialog(false);
    };

    const handleCancelDelete = () => {
        setOpenDeleteDialog(false);
    };

    const handleItemClick = () => {
        navigateToFileInfo(file.fileId);
    };

    const handleDialogInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFileNameWithoutExtension(e.target.value);
    };

    return (
        <>
            <ListItem button onClick={handleItemClick}>
                <ListItemText primary={file.fileName} secondary={`Size: ${formatFileSize(file.fileSize)} | Uploaded At: ${file.uploadedAt}`} sx={{ mr: 10 }} />
                <ListItemSecondaryAction>
                    <IconButton edge="end" aria-label="Edit" onClick={handleEditClick}>
                        <EditIcon />
                    </IconButton>
                    <IconButton edge="end" aria-label="Delete" onClick={handleDeleteClick} sx={{ ml: 0.8 }}>
                        <DeleteIcon />
                    </IconButton>
                    <IconButton edge="end" aria-label="Move to Folder" onClick={() => setOpenMoveToFolderDialog(true)} sx={{ ml: 0.8 }}>
                        <DriveFileMove />
                    </IconButton>
                </ListItemSecondaryAction>
            </ListItem>

            <Dialog open={openEditDialog} onClose={handleCancelClick}>
                <DialogTitle>Edit File Name</DialogTitle>
                <DialogContent>
                    <TextField
                        value={fileNameWithoutExtension}
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

            <Dialog open={openDeleteDialog} onClose={handleCancelDelete}>
                <DialogTitle>Confirm Deletion</DialogTitle>
                <DialogContent>
                    <p>Are you sure you want to delete this file?</p>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleDeleteConfirmation} color="primary">
                        Delete
                    </Button>
                    <Button onClick={handleCancelDelete} color="secondary">
                        Cancel
                    </Button>
                </DialogActions>
            </Dialog>

            <MoveToFileFolderDialog
                open={openMoveToFolderDialog}
                onClose={() => setOpenMoveToFolderDialog(false)}
                onMoveFile={onMoveFile}
                file={file}
            />
        </>
    );
};

export default FileComponent;
