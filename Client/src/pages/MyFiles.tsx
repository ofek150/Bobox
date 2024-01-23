import React, { useEffect, useState } from 'react';
import { auth, deleteFile, getAllFilesOfUser, renameFile, createFolder } from '../services/firebase';
import { File } from '../utils/types';
import { Typography, Grid, Alert, Container, Dialog, DialogTitle, DialogContent, TextField, DialogActions, Button, Fab } from '@mui/material';
import Loading from '../components/Loading';
import { getPrivateDownloadId } from '../services/firebase';
import { useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import FileComponent from '../components/FileComponent';
import AddIcon from '@mui/icons-material/Add';

interface CreateFolderDialogProps {
  open: boolean;
  onClose: () => void;
  onCreateFolder: (folderName: string) => void;
}

const CreateFolderDialog: React.FC<CreateFolderDialogProps> = ({ open, onClose, onCreateFolder }) => {
  const [folderName, setFolderName] = useState('');

  const handleCreateFolder = () => {
    onCreateFolder(folderName);
    setFolderName('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Create Folder</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          id="folderName"
          label="Folder Name"
          fullWidth
          value={folderName}
          onChange={(e) => setFolderName(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleCreateFolder}>Create</Button>
      </DialogActions>
    </Dialog>
  );
};


const MyFiles: React.FC = () => {
  const [user, loadingAuthState] = useAuthState(auth);
  const [files, setFiles] = useState<File[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateFolderDialogOpen, setCreateFolderDialogOpen] = useState(false);
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
    setError(null);

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
    setError(null);
  };

  const handleError = (error: string | null = null) => {
    setError(error);
  };

  if (loading || loadingAuthState) {
    return <Loading />;
  }

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

  const handleCreateFolder = async (folderName: string) => {
    const { success, error } = await createFolder({ folderName, inFolder: "root" });
    if (error || !success) {
      handleError(error);
      return;
    }
    setError(null);
  };

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
      {/* <Button variant="contained" onClick={() => setCreateFolderDialogOpen(true)}>
        Create Folder
      </Button> */}
      {files && (
        <Grid container spacing={2}>
          {files.map((file) => (
            <Grid item xs={12} sm={6} md={4} key={file.fileId}>
              <FileComponent file={file} navigateToFileInfo={navigateToFileInfo} onEditFileName={handleEditFileName} onDeleteFile={handleDeleteFile} />
            </Grid>
          ))}
        </Grid>
      )}
      <Fab
        color="primary"
        style={{ position: 'fixed', bottom: '32px', left: '50%', transform: 'translateX(-50%)', marginBottom: '16px' }}
        onClick={() => setCreateFolderDialogOpen(true)}
      >
        <AddIcon />
      </Fab>
      <CreateFolderDialog
        open={isCreateFolderDialogOpen}
        onClose={() => setCreateFolderDialogOpen(false)}
        onCreateFolder={handleCreateFolder}
      />
    </Container>
  );
};

export default MyFiles;
