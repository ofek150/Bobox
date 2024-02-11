import React, { useEffect, useState } from 'react';
import ShowFileInfo from '../components/ShowFileInfo';
import { DownloadInfoParams, SharedFile } from '../utils/types';
import { getFileInfo } from '../services/firebase';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, Button, Container, Paper, Typography, CircularProgress, Modal } from '@mui/material';
import Loading from '../components/Loading';
import FileNotFound from '../components/FileNotFound';
import streamSaver from 'streamsaver';

const FileInfo: React.FC = () => {
  const { ownerUid, fileId, downloadId } = useParams();

  const navigate = useNavigate();
  const [fileInfo, setFileInfo] = useState<SharedFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fileNotFound, setFileNotFound] = useState<boolean>(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  useEffect(() => {
    const fetchFileInfo = async () => {
      console.log("Retrieving file info...");
      if (!ownerUid || !fileId || !downloadId) navigate("/user/folders/root");
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

  const handleDownload = async () => {
    if (fileInfo && fileInfo.downloadLink) {
      try {
        const res = await fetch(fileInfo.downloadLink);
        if (!res || !res.body) throw new Error("download failed");

        const fileStream = streamSaver.createWriteStream(fileInfo.fileName);
        const writer = fileStream.getWriter();

        const reader = res.body.getReader();

        const pump: any = () => reader.read()
          .then(({ value, done }) => {
            if (done) writer.close();
            else {
              writer.write(value);
              return writer.ready.then(pump);
            }
          });

        await pump()
          .then(() => console.log('Closed the stream, Done writing'))
          .catch((err: any) => {
            handleError("An error occurred during the download.");
            console.log(err);
          });

      } catch (error) {
        handleError("An error occurred during the download.");
      }
    }
  };

  const openPreviewModal = () => {
    setShowPreviewModal(true);
  };

  const closePreviewModal = () => {
    setShowPreviewModal(false);
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
          <ShowFileInfo {...fileInfo!} />
          {fileInfo?.fileType && fileInfo.fileType.startsWith('image/') && (
            <>
              <Button variant="outlined" color="primary" onClick={openPreviewModal} sx={{ mt: 4, mb: 1 }}>
                View Image
              </Button>
              <Modal open={showPreviewModal} onClose={closePreviewModal}>
                <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', bgcolor: 'background.paper', boxShadow: 24, p: 4, maxWidth: '80vw', maxHeight: '80vh', overflow: 'auto' }}>
                  <img src={fileInfo.downloadLink} alt={fileInfo.fileName} style={{ width: '100%', height: 'auto' }} />
                </Box>
              </Modal>
            </>
          )}
          {!error && (
            <Button variant="contained" color="primary" onClick={handleDownload} sx={{ my: 1 }}>
              Download
            </Button>
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
};

export default FileInfo;