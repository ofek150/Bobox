import React, { useEffect, useState } from 'react';
import ShowFileInfo from '../components/ShowFileInfo';
import { DownloadInfoParams, SharedFile } from '../utils/types';
import { getFileInfo } from '../services/firebase';
import { useParams } from 'react-router-dom';
import { Alert, Box, Button, Container, Paper, Typography } from '@mui/material';
import Loading from '../components/Loading';
import FileNotFound from '../components/FileNotFound';
import axios from 'axios';
import { createWriteStream } from "streamsaver"

const FileInfo: React.FC = () => {
  const { ownerUid, fileId, downloadId } = useParams();

  const [fileInfo, setFileInfo] = useState<SharedFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fileNotFound, setFileNotFound] = useState<boolean>(false);

  useEffect(() => {
    const fetchFileInfo = async () => {
      console.log("Retrieving file info...");
      const downloadInfoParams: DownloadInfoParams = {
        ownerUid: ownerUid!,
        fileId: fileId!,
        downloadId: downloadId!,
      };
      try {
        const { fileInfo } = await getFileInfo(downloadInfoParams);
        console.log(fileInfo);
        setFileInfo(fileInfo);
      } catch (error: any) {
        handleError(error.message || "An error occurred while fetching file information.");
      } finally {
        setLoading(false);
        setFileNotFound(true);
      }
    };
    fetchFileInfo();
  }, []);

  const handleError = (error: string | null = null) => {
    setError(error);
  };
  const downloadFile = async (url: string, fileName: string) => {
    try {
      const response = await axios({
        url: url,
        method: 'GET',
        responseType: 'arraybuffer',
      });

      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));

      const downloadLink = document.createElement('a');
      downloadLink.href = blobUrl;
      downloadLink.download = fileName || 'downloaded-file';

      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      // Revoke the Blob URL to free up resources
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  const handleDownload = async () => {
    if (fileInfo && fileInfo.downloadLink) {
      try {
        await downloadFile(fileInfo.downloadLink, fileInfo.fileName);
      } catch (error) {
        console.error('Error downloading file:', error);
      }
    }
  };


  if (loading) {
    return <Loading />;
  }

  if (!fileInfo && !loading) {
    handleError("File information not available. Please try again later.");
    return <FileNotFound />;
  }

  return (
    <Box style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <Container maxWidth="xs">
        <Paper elevation={3} sx={{ py: 2, px: 1, borderRadius: 5, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <Typography variant="h4" gutterBottom sx={{ mb: 2, fontWeight: "bold" }}>
            Shared File
          </Typography>
          <ShowFileInfo {...fileInfo!} />
          {fileInfo?.fileType && fileInfo.fileType.startsWith('image/') && (
            <>
              <Typography variant="h6" gutterBottom sx={{ my: 2, fontWeight: "bold" }}>
                Preview
              </Typography>
              <img src={fileInfo.downloadLink} alt={fileInfo.fileName} style={{ maxWidth: '100%', maxHeight: '400px' }} />
            </>
          )}
          {!error && (
            <Button variant="contained" color="primary" onClick={handleDownload} sx={{ mt: 3, mb: 1 }}>
              Download
            </Button>)}
          {error && (
            <Alert severity="error" sx={{ my: 1 }}>
              {error}
            </Alert>
          )}
        </Paper>
      </Container>
    </Box>
  );
};

export default FileInfo;
