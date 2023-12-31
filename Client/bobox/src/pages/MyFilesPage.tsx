import React, { useEffect, useState } from 'react';
import { getFilesOfUser } from '../services/firebase';
import { File } from '../utils/types';
import { Typography, List, ListItem, ListItemText, Card, CardContent, Alert } from '@mui/material';

const MyFilesPage: React.FC = () => {
  const [files, setFiles] = useState<File[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(async () => {
    try {
      const { files, error } = await getFilesOfUser();
      setFiles(files);
      if (error) {
        console.error(error);
        setError(error);
      }
    } catch (error) {
      console.error('Error fetching files:', error.message);
      setError('Failed to fetch files.');
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div>
      <Typography variant="h4" gutterBottom>
        Files List
      </Typography>
      {loading && <p>Loading...</p>}
      {error && (
        <Alert severity="error" sx={{ mb: 2, mt: 2, pl: 1, pr: 1, width: '100%' }}>
          {error}
        </Alert>
      )}
      {files && (
        <List>
          {files.map((file) => (
            <ListItem key={file.fileId}>
              <Card>
                <CardContent>
                  <Typography variant="h6">{file.fileName}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Type: {file.fileType}, Size: {file.fileSize} bytes, Uploaded At: {file.uploadedAt.toISOString()}
                  </Typography>
                </CardContent>
              </Card>
            </ListItem>
          ))}
        </List>
      )}
    </div>
  );
};

export default MyFilesPage;
