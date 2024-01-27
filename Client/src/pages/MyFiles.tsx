import React, { useEffect, useState } from 'react';
import { auth, deleteFile, getAllFilesOfUser, renameFile, createFolder, moveFileToFolder, renameFolder } from '../services/firebase';
import { File, Folder } from '../utils/types';
import { Typography, Alert, Container, Dialog, DialogTitle, DialogContent, TextField, DialogActions, Button, Fab, List } from '@mui/material';
import Loading from '../components/Loading';
import { getPrivateDownloadId } from '../services/firebase';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import AddIcon from '@mui/icons-material/Add';
import PublishIcon from '@mui/icons-material/Publish';
import FolderComponent from '../components/FolderComponent';
import { useFolderStructureContext } from '../contexts/FolderStructureContext';

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
  const { folderId } = useParams();
  const [files, setFiles] = useState<File[] | null>(null);
  const [folders, setFolders] = useState<Folder[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateFolderDialogOpen, setCreateFolderDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { folderStructure, updateFolderStructure } = useFolderStructureContext();

  const fetchFiles = async () => {
    try {
      const { folders, files, error } = await getAllFilesOfUser();
      setFiles(files);
      setFolders(folders);
      if (error) {
        console.error(error);
        setError(error);
      }
    } catch (error: any) {
      console.error('Error fetching files:', error.message);
      setError('Failed to fetch files.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  useEffect(() => {
    if (folders) {
      updateFolderStructure(folders, files);
      setLoading(false);
    }
  }, [files, folders]);

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

  const handleEditFolderName = async (folderId: string, newFolderName: string) => {
    if (!folders) return;
    console.log("Renaming folder with folderId: " + folderId + " to " + newFolderName);

    const { success, error } = await renameFolder({ folderId, newFolderName });
    if (error || !success) {
      console.error(error);
      setError(error);
      return;
    }

    setFolders((prevFolders) =>
      prevFolders!.map((folder) =>
        folder.folderId === folderId ? { ...folder, folderName: newFolderName } : folder
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
    const { success, error } = await createFolder({ folderName, inFolder: folderId ? folderId : "" });
    if (error || !success) {
      handleError(error);
      return;
    }
    setError(null);
    await fetchFiles();
  };

  const handleMoveFile = async (fileId: string, currentFolderId: string, newFolderId: string) => {
    const { success, error } = await moveFileToFolder({ fileId: fileId, currentFolderId: currentFolderId, newFolderId: newFolderId });
    if (error || !success) {
      handleError(error);
      return;
    }
    setError(null);
    await fetchFiles();
  };

  const handleUploadClick = () => {
    navigate(`/user/folders/${folderId}/upload`);
  };

  return (
    <Container maxWidth="md" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '20px' }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, mb: 8 }}>
        My Storage
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2, mt: 2, pl: 1, pr: 1, width: '100%' }}>
          {error}
        </Alert>
      )}
      {
        folderStructure && folderId &&
        <FolderComponent folderId={folderId} selectFolder={false} navigateToFileInfo={navigateToFileInfo} handleEditFileName={handleEditFileName} handleDeleteFile={handleDeleteFile} handleEditFolderName={handleEditFolderName} handleMoveFile={handleMoveFile} />
      }
      <div style={{ position: 'fixed', bottom: '32px', left: '50%', transform: 'translateX(-50%)', width: '100%', textAlign: 'center' }}>
        <Fab
          color="primary"
          style={{ marginBottom: '16px', marginRight: '8px' }}
          onClick={() => setCreateFolderDialogOpen(true)}
        >
          <AddIcon />
        </Fab>

        <Fab
          color="primary"
          style={{ marginBottom: '16px' }}
          onClick={handleUploadClick}
        >
          <PublishIcon />
        </Fab>
      </div>
      <CreateFolderDialog
        open={isCreateFolderDialogOpen}
        onClose={() => setCreateFolderDialogOpen(false)}
        onCreateFolder={handleCreateFolder}
      />
    </Container>
  );
};

export default MyFiles;
