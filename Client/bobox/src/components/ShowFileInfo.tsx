import React from 'react';
import { SharedFile } from '../utils/types'; 
import { Box, Typography } from '@mui/material';
import { formatFileSize } from '../utils/helpers';

const ShowFileInfo: React.FC<SharedFile> = ({ fileName, fileType, fileSize, uploadedAt }) => {
  const formattedDate = new Date(uploadedAt).toLocaleDateString('en-GB');

  return (
    <Box >
      <Typography variant='body2'><b>File Name:</b> {fileName}</Typography>
      <Typography variant='body2'><b>File Size:</b> {formatFileSize(fileSize)}</Typography>
      {formattedDate != "Invalid Date" && (<Typography variant='body2'><b>Uploaded at:</b> {formattedDate}</Typography>)}
    </Box>
  );
};

export default ShowFileInfo;