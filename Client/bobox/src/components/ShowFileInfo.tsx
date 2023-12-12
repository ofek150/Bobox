import React from 'react';
import { SharedFile } from '../utils/types'; 
import { Box, Typography } from '@mui/material';
import { formatFileSize } from '../utils/helpers';

const ShowFileInfo: React.FC<SharedFile> = ({fileName, fileType, fileSize, uploadedAt}) => {
    
    const formattedDate = new Date(uploadedAt).toLocaleDateString('en-GB');
    
    return (
        <Box>
            <Typography variant='h4'>File Name: {fileName}</Typography>
            <Typography variant='h4'>File Type: {fileType}</Typography>
            <Typography variant='h4'>File Size: {formatFileSize(fileSize)}</Typography>
            <Typography variant='h4'>Uploaded at: {formattedDate}</Typography>
        </Box>
    )
}
export default ShowFileInfo;