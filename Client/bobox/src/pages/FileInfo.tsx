import React, { useEffect, useRef, useState } from 'react';
import ShowFileInfo from '../components/ShowFileInfo';
import { DownloadInfoParams, SharedFile } from '../utils/types';
import { getFileInfo } from '../services/firebase';
import { CircularProgress, Button, Alert, Container, Paper, Box, Typography } from '@mui/material';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import CircularProgressWithLabel from '../components/UI/CircularProgressWithLabel';

const FileInfo: React.FC = () => {
  const { ownerUid, fileId, downloadId } = useParams();
  const [fileInfo, setFileInfo] = useState<SharedFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloaded, setDownloaded] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [isCancelled, setIsCancelled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortController = useRef(new AbortController());

  useEffect(() => {
    const fetchFileInfo = async () => {
      console.log(ownerUid, fileId, downloadId);
      console.log("Retrieving file info...");
      if (!ownerUid || !fileId || !downloadId) {
        setError('Invalid parameters');
        return;
      }

      const downloadInfoParams: DownloadInfoParams = {
        ownerUid: ownerUid,
        fileId: fileId,
        downloadId: downloadId,
      };

      try {
        const { fileInfo, error } = await getFileInfo(downloadInfoParams);
        if (error) {
          handleDownloadError(error);
        } else {
          console.log(fileInfo);
          setFileInfo(fileInfo);
        }
      } catch (error) {
        console.error('Error fetching file info:', error);
        handleDownloadError('Failed to fetch file information. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchFileInfo();
  }, []);

  const downloadPart = async (partLink: string, signal: AbortSignal, updateProgress: (increment: number) => void) => {
    try {
      const response = await axios.get(partLink, { signal: signal, responseType: 'arraybuffer', onDownloadProgress: (progressEvent) => {
        // Calculate the increment in progress for this part
        if (progressEvent.total) {
            const partProgress = (progressEvent.loaded / progressEvent.total) * 100;
            updateProgress(partProgress);
        }
    } });
      return response.data;
    } catch (error) {
      console.error('Error downloading part:', error);
      handleDownloadError()
      throw error;
    }
  };

  const downloadAndAssembleFile = async () => {
      if (fileInfo && fileInfo.downloadLinks && fileInfo.downloadLinks.length > 0) {
        
        const assembleFile = async () => {
          const maxRetries = 3;
          const partProgressArray = Array(fileInfo.downloadLinks.length).fill(0);
          const downloadPromises = [];
          const parts: any = [];
          for (let i = 0; i < fileInfo.downloadLinks.length; i++) {
            const partLink = fileInfo.downloadLinks[i];
              console.log("Part url: ", partLink);
              const signal = abortController.current.signal;
              downloadPromises.push(
                downloadAndRetry(partLink, parts, signal, maxRetries, (partProgress) => {
                  // Update the part's progress in the array
                  partProgressArray[i - 1] = partProgress;

                  // Calculate the overall progress based on the sum of part progress
                  const overallProgress = (partProgressArray.reduce((sum, value) => sum + value, 0) / fileInfo.downloadLinks.length);
                  setProgress(overallProgress);
                }).catch((error: any) => {
                  if (error & error.message) {
                    handleDownloadError(error.message);
                  }
                  else {
                    handleDownloadError()
                  }
                  return;
                })
              );
          }
          try {
            await Promise.all(downloadPromises);
            if(isCancelled) return;

            const assembledFile = new Uint8Array(
              parts.reduce((acc: any, part: any) => [...acc, ...new Uint8Array(part)], [])
            );
            const assembledBlob = new Blob([assembledFile]);
            const downloadLink = document.createElement('a');
            downloadLink.href = URL.createObjectURL(assembledBlob);
            downloadLink.download = fileInfo.fileName;
            downloadLink.click();
          } catch (error: any) {
            handleDownloadError()
            return;
          } 
        }

        const downloadAndRetry = async (partLink: string, parts: any, signal: AbortSignal, maxRetries: number, updateProgress: (increment: number) => void) => {
          for (let retryCount = 0; retryCount < maxRetries; retryCount++) {
            try {
              if(isCancelled) throw new Error("Download cancelled");
              parts.push(await downloadPart(partLink, signal, updateProgress));
              return true;
            } catch (downloadError) {
              console.warn(`Retrying download part after failure (${retryCount + 1} of ${maxRetries})`);
            }
          }
          throw new Error(`Failed to download part after ${maxRetries} retries`);
        }

        await assembleFile();
      }
  };

  const handleDownload = async () => {
    try {
      setIsCancelled(false);
      setProgress(0);
      abortController.current = new AbortController();

      await downloadAndAssembleFile();

      if (!isCancelled) {
        setDownloaded(true);
      }
    } catch (error) {
      if (!isCancelled) {
        handleDownloadError('Failed to download file. Please try again.');
      }
    }
  };

  const handleDownloadError = (errorMessage: string | null = null) => {
    setProgress(0);
    setIsCancelled(true);
    abortController.current.abort();
    abortController.current = new AbortController();
    setError(
      errorMessage || 'Failed to download file. Please check your internet connection and try again.'
    );
  };

  const handleCancelDownload = () => {
    setIsCancelled(true);
    setDownloaded(false);
    abortController.current.abort();
    setError('Download canceled by user.');
  };

  if (loading) {
    return <CircularProgress />;
  }

  if (!fileInfo) {
    return (
      <Alert severity="error">
        {error || 'File information not available. Please try again later.'}
      </Alert>
    );
  }

  return (
    <Box style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <Container maxWidth="xs">
        <Paper elevation={3} sx={{ py: 2, px: 1, borderRadius: 5, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <Typography variant="h4" gutterBottom sx={{ mb: 2, fontWeight: "bold" }}>
            Shared File
          </Typography>
          <ShowFileInfo {...fileInfo} />
          {!downloaded && (
            <>
              <Button variant="contained" color="primary" onClick={handleDownload} disabled={progress > 0} sx={{ mt: 3, mb: 1 }}>
                {progress > 0 ? 'Downloading...' : 'Download File'}
              </Button>
            </>
          )}
          {progress > 0 && !isCancelled && (
                <>
                  <CircularProgressWithLabel value={progress} sx={{ mt: 1, mb: 2 }} />
                  {/* <Button variant="outlined" color="secondary" onClick={handleCancelDownload} style={{ marginLeft: '8px' }}>
                    Cancel Download
                  </Button> */}
                </>
          )}
          {error && (
            <Alert severity="error" sx={{ my: 1 }}>
              {error}
            </Alert>
          )}
        </Paper>
      </Container>
    </Box>
  );
}

export default FileInfo;
