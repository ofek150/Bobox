import React, { useEffect, useState } from 'react';
import { deleteFile, getAllFilesOfUser, renameFile, createFolder, moveFileToFolder, renameFolder, deleteFolder } from '../services/firebase';
import { File, Folder } from '../utils/types';
import { Container, Dialog, DialogTitle, DialogContent, TextField, DialogActions, Button, Fab, Typography, Box, useMediaQuery } from '@mui/material';
import Loading from '../components/Loading';
import { useNavigate, useParams } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import PublishIcon from '@mui/icons-material/Publish';
import FolderComponent from '../components/FolderComponent';
import { useFolderStructureContext } from '../contexts/FolderStructureContext';
import SearchBox from '../components/UI/SearchBox';
import { enqueueSnackbar } from 'notistack';
import PathBar from '../components/UI/PathBar';

import theme from '../theme';

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
  const { folderId } = useParams();
  const [_folderId] = useState(folderId);
  const [files, setFiles] = useState<File[] | null>(null);
  const [folders, setFolders] = useState<Folder[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreateFolderDialogOpen, setCreateFolderDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { folderStructure, updateFolderStructure, getFolderWithId } = useFolderStructureContext();
  const [isValidFolder, setIsValidFolder] = useState<boolean>(false);
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const fetchFiles = async () => {
    try {
      const result = await getAllFilesOfUser();
      const { folders, files, error } = result;
      updateFolderStructure(folders, files);
      setFiles(files);
      setFolders(folders);
      if (error) {
        handleError(error);
      }
    } catch (error: any) {
      handleError('Failed to fetch files.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  useEffect(() => {
    if (folders) {
      updateFolderStructure(folders, files);
    }
  }, [files, folders]);

  useEffect(() => {
    if (folderStructure.size > 0) {
      setLoading(false);

      const folder = getFolderWithId(folderId ?? '')
      if (folder) setIsValidFolder(true);
    }
  }, [folderStructure]);

  const handleEditFileName = async (fileId: string, newFileName: string) => {
    if (!files) return false;
    console.log("Renaming file with fileId: " + fileId + " to " + newFileName);

    const parts = newFileName.split('.');
    const fileExtension = parts.pop();
    const fileNameWithoutExtension = parts.join('.');
    const updatedFileName = fileNameWithoutExtension + (fileExtension ? '.' + fileExtension : "");

    newFileName = fileNameWithoutExtension;

    const { success, error } = await renameFile({ fileId, newFileName });
    if (error || !success) {
      handleError(error);
      return false;
    }

    const file = files?.find(file => file.fileId === fileId);
    handleSuccess(`The name was changed from "${file?.fileName}" to "${newFileName}"`);

    setFiles((prevFiles) =>
      prevFiles!.map((file) =>
        file.fileId === fileId ? { ...file, fileName: updatedFileName } : file
      )
    );
    return true;
  };

  const handleEditFolderName = async (folderId: string, newFolderName: string) => {
    if (!folders) return;
    console.log("Renaming folder with folderId: " + folderId + " to " + newFolderName);

    const { success, error } = await renameFolder({ folderId, newFolderName });
    if (error || !success) {
      handleError(error);
      return false;
    }

    const folder = getFolderWithId(folderId);
    handleSuccess(`The name was changed from "${folder?.folderName}" to "${newFolderName}"`);

    setFolders((prevFolders) =>
      prevFolders!.map((folder) =>
        folder.folderId === folderId ? { ...folder, folderName: newFolderName } : folder
      )
    );
    return true;
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!files) return;
    console.log("Deleting file with fileId: " + fileId);

    const { success, error } = await deleteFile(fileId);
    if (error || !success) {
      handleError(error);
      return;
    }
    const file = files?.find(file => file.fileId === fileId);
    handleSuccess(`The file with the name "${file?.fileName}" was successfully deleted`);
    setFiles((prevFiles) => prevFiles!.filter((file) => file.fileId !== fileId));
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!folders) return;
    console.log("Deleting folder with foldereId: " + folderId);

    const { success, error } = await deleteFolder(folderId);
    if (error || !success) {
      handleError(error);
      return;
    }
    const folder = getFolderWithId(folderId);
    handleSuccess(`The folder with the name ${folder?.folderName}" was successfullly deleted`);
    await fetchFiles();
  };

  const handleError = (error: string | null = null) => {
    console.error(error);
    enqueueSnackbar(error, {
      variant: 'error',
      preventDuplicate: true
    });
  };

  const handleSuccess = (message: string) => {
    enqueueSnackbar(message, {
      variant: 'success',
      preventDuplicate: true
    });
  };

  if (loading) {
    return <Loading />;
  }

  const handleCreateFolder = async (folderName: string) => {
    const { success, error } = await createFolder({ folderName, parentFolderId: folderId ? folderId : "" });
    if (error || !success) {
      handleError(error);
      return;
    }
    handleSuccess(`A folder with the name "${folderName}" was successfully created`);
    await fetchFiles();
  };

  const handleMoveFile = async (fileId: string, currentFolderId: string, newFolderId: string) => {
    const { success, error } = await moveFileToFolder({ fileId: fileId, currentFolderId: currentFolderId, newFolderId: newFolderId });
    if (error || !success) {
      handleError(error);
      return;
    }
    const currentFolder = getFolderWithId(currentFolderId);
    const newFolder = getFolderWithId(newFolderId);
    const file = files?.find(file => file.fileId === fileId);
    handleSuccess(`The file with the name ${file?.fileName}" was successfully moved from "${currentFolder?.folderName}" to "${newFolder?.folderName}"`);
    await fetchFiles();
  };

  const handleUploadClick = () => {
    navigate(`/user/folders/${folderId}/upload`);
  };

  return (
    <Container maxWidth="md" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pb: 10 }}>
      <SearchBox placeholder="Search files and folders" />

      <Box sx={{ alignSelf: 'center' }}>
        {folderStructure && folderId && isValidFolder && !isMobile && <PathBar folderId={folderId} />}
      </Box>
      {
        folderStructure && folderId && isValidFolder ?
          <>
            <FolderComponent folderId={folderId} selectFolder={false} handleEditFileName={handleEditFileName} handleDeleteFile={handleDeleteFile} handleDeleteFolder={handleDeleteFolder} handleEditFolderName={handleEditFolderName} handleMoveFile={handleMoveFile} />
          </>
          : <Typography variant="h4" sx={{ my: 5, fontWeight: 500 }}>Folder not found</Typography>
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
    </Container >
  );
};

export default MyFiles;
