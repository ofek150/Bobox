import React, { useEffect, useState } from 'react';
import { auth, generatePrivateDownloadLink, getFilesOfUser } from '../services/firebase';
import { File, SharedFile } from '../utils/types';
import { Typography, Grid, Card, CardContent, Alert, Container, Button } from '@mui/material';
import { formatFileSize } from '../utils/helpers';
import Loading from '../components/Loading';
import streamSaver from 'streamsaver';
import { getPrivateDownloadId } from '../services/firebase';
import { useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';

const MyFiles: React.FC = () => {
  const [user, loadingAuthState] = useAuthState(auth);
  const [files, setFiles] = useState<File[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();


  useEffect(() => {
    const fetchData = async () => {
      try {
        const { files, error } = await getFilesOfUser();
        setFiles(files);
        if (error) {
          console.error(error);
          setError(error);
        }
      } catch (error: any) {
        console.error('Error fetching files:', error.message);
        setError('Failed to fetch files.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleError = (error: string | null = null) => {
    setError(error);
  };

  if (loading || loadingAuthState) {
    return <Loading />;
  }

  // const handleDownload = async (fileInfo: File) => {
  //   try {
  //     const { downloadLink, error } = await generatePrivateDownloadLink(fileInfo.fileId);
  //     if (error) {
  //       handleError(error);
  //       return;
  //     }
  //     console.log("Download link: " + downloadLink);
  //     const res = await fetch(downloadLink);
  //     if (!res || !res.body) throw new Error("download failed");

  //     const fileStream = streamSaver.createWriteStream(fileInfo.fileName);
  //     const writer = fileStream.getWriter();

  //     const reader = res.body.getReader();

  //     const pump: any = () => reader.read()
  //       .then(({ value, done }) => {
  //         if (done) writer.close();
  //         else {
  //           writer.write(value);
  //           return writer.ready.then(pump);
  //         }
  //       });

  //     await pump()
  //       .then(() => console.log('Closed the stream, Done writing'))
  //       .catch((err: any) => {
  //         handleError("An error occurred during the download.");
  //         console.error(err);
  //       });

  //   } catch (error: any) {
  //     handleError("An error occurred during the download.");
  //     console.error(error.message);
  //   }
  // }

  const navigateToFileInfo = async (fileId: string) => {
    const { downloadId, error } = await getPrivateDownloadId(fileId);
    console.log(downloadId);
    if (error) {
      handleError("Couldn't fetch file information");
      return;
    }
    const link = `/${user?.uid}/${fileId}/${downloadId}/view`
    navigate(link);
  }

  return (
    <Container maxWidth="md" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '20px' }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, mb: 8 }}>
        Files List
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2, mt: 2, pl: 1, pr: 1, width: '100%' }}>
          {error}
        </Alert>
      )}
      {files && (
        <Grid container spacing={2}>
          {files.map((file) => (
            <Grid item xs={12} sm={6} md={4} key={file.fileId}>
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
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
};

export default MyFiles;
