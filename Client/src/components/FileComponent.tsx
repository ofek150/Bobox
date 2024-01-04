import { Button, Card, CardContent, Typography, IconButton, TextField } from "@mui/material";
import EditIcon from '@mui/icons-material/Edit';
import React, { useEffect, useRef, useState } from "react";
import { formatFileSize } from "../utils/helpers";
import { File } from "../utils/types";

interface FileComponentProps {
    file: File;
    navigateToFileInfo: (fileId: string) => void;
    onEditFileName: (fileId: string, newFileName: string) => void;
}

const FileComponent: React.FC<FileComponentProps> = ({ file, navigateToFileInfo, onEditFileName }: FileComponentProps) => {
    const [isEditing, setEditing] = useState(false);
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

    useEffect(() => {
        console.log("File name without extension: " + fileNameWithoutExtension);
    }, [fileNameWithoutExtension]);

    return (
        <Card sx={{ marginBottom: '15px', width: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                    {isEditing ? (
                        <TextField
                            value={fileNameWithoutExtension}
                            onChange={(e) => setFileNameWithoutExtension(e.target.value)}
                            autoFocus
                        />
                    ) : (
                        <>
                            <Typography variant="h6" sx={{ mb: 1 }}>{fileNameWithoutExtension}</Typography>
                            <Typography variant="body2" color="textSecondary" sx={{ ml: 1, mb: 1 }}>
                                {fileExtension.current}
                            </Typography>
                            <IconButton onClick={handleEditClick} sx={{ ml: 1, mb: 1 }}>
                                <EditIcon />
                            </IconButton>
                        </>
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
        </Card>
    );
};

export default FileComponent;
