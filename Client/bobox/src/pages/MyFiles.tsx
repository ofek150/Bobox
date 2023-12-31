import React, { useEffect, useState } from 'react';
import { getFilesOfUser } from '../services/firebase';
import { File } from '../utils/types';
import { Typography, Grid, Card, CardContent, Alert, Container } from '@mui/material';
import { formatFileSize } from '../utils/helpers';
import Loading from '../components/Loading';

const MyFiles: React.FC = () => {
  const [files, setFiles] = useState<File[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) {
    return <Loading />;
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
