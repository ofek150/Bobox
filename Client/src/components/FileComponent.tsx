import { Button, Card, CardContent, Typography } from "@mui/material";
import React from "react";
import { formatFileSize } from "../utils/helpers";
import { File } from "../utils/types";

interface FileComponentProps {
    file: File;
    navigateToFileInfo: (fileId: string) => void;
}

const FileComponent: React.FC<FileComponentProps> = ({ file, navigateToFileInfo }: FileComponentProps) => {

    return (
        <Card sx={{ marginBottom: '15px', width: '100%' }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Typography variant="h6">{file.fileName}</Typography>
                <Typography variant="body2" color="textSecondary">
                    Type: {file.fileType}<br />
                    Size: {formatFileSize(file.fileSize)}<br />
                    Uploaded At: {file.uploadedAt}
                </Typography>
                <Button variant="contained" color="primary" onClick={() => navigateToFileInfo(file.fileId)} sx={{ mt: 3, mb: 1 }}>
                    Go To File Info
                </Button>
            </CardContent>
        </Card>
    )
}

export default FileComponent;