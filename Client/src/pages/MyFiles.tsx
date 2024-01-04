import React, { useEffect, useState } from 'react';
import { auth, deleteFile, getAllFilesOfUser, renameFile } from '../services/firebase';
import { File } from '../utils/types';
import { Typography, Grid, Alert, Container } from '@mui/material';
import Loading from '../components/Loading';
import { getPrivateDownloadId } from '../services/firebase';
import { useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import FileComponent from '../components/FileComponent';

const MyFiles: React.FC = () => {
  const [user, loadingAuthState] = useAuthState(auth);
  const [files, setFiles] = useState<File[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();


  useEffect(() => {
    const fetchData = async () => {
      try {
        const { files, error } = await getAllFilesOfUser();
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

  const handleEditFileName = async (fileId: string, newFileName: string) => {
    if (!files) return;
    console.log("Renaming file with fileId: " + fileId + " to " + newFileName);

    const { success, error } = await renameFile({ fileId, newFileName });
    if (error || !success) {
      console.error(error);
      setError(error);
      return;
    }

    setFiles((prevFiles) =>
      prevFiles!.map((file) =>
        file.fileId === fileId ? { ...file, fileName: newFileName } : file
      )
    );


  };

  const handleDeleteFile = async (fileId: string) => {
    if (!files) return;
    console.log("Deleting file with fileId: " + fileId);

    const { success, error } = await deleteFile(fileId);
    if (error || !success) {
      console.error(error);
      setError(error);
      return;
    }

    setFiles((prevFiles) => prevFiles!.filter((file) => file.fileId !== fileId));

  };

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
    const link = `/${user?.uid}/${fileId}/${downloadId}/view`;
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
              <FileComponent file={file} navigateToFileInfo={navigateToFileInfo} onEditFileName={handleEditFileName} onDeleteFile={handleDeleteFile} />
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
};

export default MyFiles;
