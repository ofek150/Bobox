import React, { useEffect, useRef, useState } from "react";
import { Button, Card, CardContent, Typography, IconButton, TextField, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
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
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const fileExtension = useRef(file.fileName.includes('.') ? `.${file.fileName.split('.').pop()}` : '');
    const [fileNameWithoutExtension, setFileNameWithoutExtension] = useState(file.fileName.replace(fileExtension.current, ''));

    const handleEditClick = () => {
        setEditing(true);
    };

    const handleSaveClick = () => {
        setEditing(false);
        onEditFileName(file.fileId, fileNameWithoutExtension);
    };

    const handleCancelClick = () => {
        setEditing(false);
        setFileNameWithoutExtension(file.fileName.replace(fileExtension.current, ''));
    };

    const handleDeleteClick = () => {
        setShowDeleteDialog(true);
    };

    const handleDeleteConfirm = () => {
        setShowDeleteDialog(false);
        onDeleteFile(file.fileId);
    };

    const handleDeleteCancel = () => {
        setShowDeleteDialog(false);
    };

    return (
        <Card sx={{ marginBottom: '15px', width: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <IconButton
                    aria-label="Delete"
                    onClick={handleDeleteClick}
                    sx={{ position: 'absolute', top: 0, right: 0 }}
                >
                    <DeleteIcon />
                </IconButton>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                    {isEditing ? (
                        <TextField
                            value={fileNameWithoutExtension}
                            onChange={(e) => setFileNameWithoutExtension(e.target.value)}
                            autoFocus
                        />
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <Typography variant="h6" sx={{ mb: 1, marginRight: 1 }}>{fileNameWithoutExtension}</Typography>
                            <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                                {fileExtension.current}
                            </Typography>
                            <IconButton onClick={handleEditClick} sx={{ ml: 1, mb: 1 }}>
                                <EditIcon />
                            </IconButton>
                        </div>
                    )}
                </div>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                    Size: {formatFileSize(file.fileSize)}<br />
                    Uploaded At: {file.uploadedAt}
                </Typography>
                <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                    {!isEditing && (
                        <Button variant="contained" color="primary" onClick={() => navigateToFileInfo(file.fileId)} sx={{ mb: 1 }}>
                            Go To File Info
                        </Button>
                    )}
                    {isEditing && (
                        <div style={{ display: 'flex', justifyContent: 'center', width: '100%', marginTop: '10px' }}>
                            <Button variant="contained" color="primary" onClick={handleSaveClick} sx={{ mr: 2 }}>
                                Save
                            </Button>
                            <Button variant="outlined" color="secondary" onClick={handleCancelClick} sx={{ ml: 2 }}>
                                Cancel
                            </Button>
                        </div>
                    )}
                </div>
            </CardContent>

            {/* Delete Confirmation Dialog */}
            <Dialog open={showDeleteDialog} onClose={handleDeleteCancel}>
                <DialogTitle>Delete File</DialogTitle>
                <DialogContent>
                    <Typography>Are you sure you want to delete the file with the name "{file.fileName}"?</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleDeleteCancel} color="primary">
                        Cancel
                    </Button>
                    <Button onClick={handleDeleteConfirm} color="secondary">
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </Card>
    );
};

export default FileComponent;
