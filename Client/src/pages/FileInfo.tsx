import React, { useEffect, useState } from 'react';
import ShowFileInfo from '../components/ShowFileInfo';
import { DownloadInfoParams, SharedFile } from '../utils/types';
import { getFileInfo } from '../services/firebase';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Box, Button, Container, Paper, Modal } from '@mui/material';
import Loading from '../components/Loading';
import streamSaver from 'streamsaver';
import { enqueueSnackbar } from 'notistack';

const FileInfo: React.FC = () => {
  const { ownerUid, fileId } = useParams();
  const [searchParams] = useSearchParams();
  const downloadId = searchParams.get("downloadId") === "undefined" ? null : searchParams.get("downloadId");
  const navigate = useNavigate();
  const [fileInfo, setFileInfo] = useState<SharedFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  useEffect(() => {
    const fetchFileInfo = async () => {
      console.log("Retrieving file info...");
      if (!ownerUid || !fileId || !downloadId) {
        navigate("/user/folders/root");
        return;
      }

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
        handleError("File information not available. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchFileInfo();
  }, [ownerUid, fileId, downloadId]);


  const handleError = (error: string | null = null) => {
    setError(error || "An error occurred while fetching file information");
    enqueueSnackbar(error, {
      variant: 'error',
      preventDuplicate: true
    });

    navigate("/user/folders/root");
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
          .catch(() => {
            handleError("An error occurred during the download.");
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

  return (
    <Box style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      {fileInfo &&
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
          </Paper>
        </Container>
      }
    </Box>
  );
};

export default FileInfo;