import React, { useEffect, useState } from 'react';
import { ListItem, ListItemText, ListItemSecondaryAction, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from "@mui/material";
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { formatFileSize } from "../utils/helpers";
import { File } from "../utils/types";

interface FileComponentProps {
    file: File;
    navigateToFileInfo: (fileId: string) => void;
    onEditFileName: (fileId: string, newFileName: string) => void;
    onDeleteFile: (fileId: string) => void;
}

const FileComponent: React.FC<FileComponentProps> = ({ file, navigateToFileInfo, onEditFileName, onDeleteFile }: FileComponentProps) => {
    const [isEditing, setEditing] = useState(false);
    const [fileNameWithoutExtension, setFileNameWithoutExtension] = useState("");
    const [openEditDialog, setOpenEditDialog] = useState(false);
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

    const fileExtension = file.fileName.split('.').pop();
    console.log("file extension: ", fileExtension);
    console.log("File name: ", file.fileName);

    useEffect(() => {
        const parts = file.fileName.split('.');
        // Remove the last element (file extension)
        parts.pop();
        setFileNameWithoutExtension(parts.join('.'));
    }, [file]);

    useEffect(() => {
        console.log("File name without extension: ", fileNameWithoutExtension);
    }, [fileNameWithoutExtension]);




    const handleEditClick = () => {
        setOpenEditDialog(true);
    };

    const handleSaveClick = () => {
        setEditing(false);
        const updatedFileName = fileNameWithoutExtension + (fileExtension ? '.' + fileExtension : "");
        console.log("Updated file name: ", updatedFileName);
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
                <ListItemText primary={file.fileName} secondary={`Size: ${formatFileSize(file.fileSize)} | Uploaded At: ${file.uploadedAt}`} sx={{ mr: 4 }} />
                <ListItemSecondaryAction>
                    <IconButton edge="end" aria-label="Edit" onClick={handleEditClick}>
                        <EditIcon />
                    </IconButton>
                    <IconButton edge="end" aria-label="Delete" onClick={handleDeleteClick} sx={{ ml: 0.8 }}>
                        <DeleteIcon />
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
        </>
    );
};

export default FileComponent;
