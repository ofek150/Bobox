import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FolderPlus, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { deleteFile, getAllFilesOfUser, renameFile, createFolder, moveFileToFolder, renameFolder, deleteFolder } from '../services/firebase';
import { File, Folder } from '../utils/types';
import Loading from '../components/Loading';
import FolderComponent from '../components/FolderComponent';
import SearchBox from '../components/UI/SearchBox';
import PathBar from '../components/UI/PathBar';
import { useFolderStructureContext } from '../contexts/FolderStructureContext';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CreateFolderDialogProps {
  open: boolean;
  onClose: () => void;
  onCreateFolder: (folderName: string) => void;
}

const CreateFolderDialog: React.FC<CreateFolderDialogProps> = ({ open, onClose, onCreateFolder }) => {
  const [folderName, setFolderName] = useState('');

  const handleCreateFolder = () => {
    if (!folderName.trim()) return;
    onCreateFolder(folderName.trim());
    setFolderName('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) { setFolderName(''); onClose(); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New folder</DialogTitle>
          <DialogDescription>Give the folder a name and it will appear here.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor="new-folder-name">Folder name</Label>
          <Input
            id="new-folder-name"
            autoFocus
            placeholder="Projects"
            value={folderName}
            onChange={(event) => setFolderName(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') handleCreateFolder(); }}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCreateFolder} disabled={!folderName.trim()}>Create folder</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const MyFiles: React.FC = () => {
  const { folderId } = useParams();
  const [files, setFiles] = useState<File[] | null>(null);
  const [folders, setFolders] = useState<Folder[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreateFolderDialogOpen, setCreateFolderDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { folderStructure, updateFolderStructure, getFolderWithId } = useFolderStructureContext();
  const [isValidFolder, setIsValidFolder] = useState<boolean>(false);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (folders) {
      updateFolderStructure(folders, files);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, folders]);

  useEffect(() => {
    if (folderStructure.size > 0) {
      setLoading(false);
      const folder = getFolderWithId(folderId ?? '')
      if (folder) setIsValidFolder(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderStructure]);

  const handleError = (error: string | null = null) => {
    console.error(error);
    toast.error(error);
  };

  const handleSuccess = (message: string) => {
    toast.success(message);
  };

  const handleEditFileName = async (fileId: string, newFileName: string) => {
    if (!files) return false;

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
    handleSuccess(`Renamed "${file?.fileName}" to "${newFileName}"`);

    setFiles((prevFiles) =>
      prevFiles!.map((file) =>
        file.fileId === fileId ? { ...file, fileName: updatedFileName } : file
      )
    );
    return true;
  };

  const handleEditFolderName = async (folderId: string, newFolderName: string) => {
    if (!folders) return;

    const { success, error } = await renameFolder({ folderId, newFolderName });
    if (error || !success) {
      handleError(error);
      return false;
    }

    const folder = getFolderWithId(folderId);
    handleSuccess(`Renamed "${folder?.folderName}" to "${newFolderName}"`);

    setFolders((prevFolders) =>
      prevFolders!.map((folder) =>
        folder.folderId === folderId ? { ...folder, folderName: newFolderName } : folder
      )
    );
    return true;
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!files) return;

    const { success, error } = await deleteFile(fileId);
    if (error || !success) {
      handleError(error);
      return;
    }
    const file = files?.find(file => file.fileId === fileId);
    handleSuccess(`"${file?.fileName}" was deleted`);
    setFiles((prevFiles) => prevFiles!.filter((file) => file.fileId !== fileId));
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!folders) return;

    const { success, error } = await deleteFolder(folderId);
    if (error || !success) {
      handleError(error);
      return;
    }
    const folder = getFolderWithId(folderId);
    handleSuccess(`"${folder?.folderName}" was deleted`);
    await fetchFiles();
  };

  const handleCreateFolder = async (folderName: string) => {
    const { success, error } = await createFolder({ folderName, parentFolderId: folderId ? folderId : "" });
    if (error || !success) {
      handleError(error);
      return;
    }
    handleSuccess(`Folder "${folderName}" was created`);
    await fetchFiles();
  };

  const handleMoveFile = async (fileId: string, currentFolderId: string, newFolderId: string) => {
    const { success, error } = await moveFileToFolder({ fileId: fileId, currentFolderId: currentFolderId, newFolderId: newFolderId });
    if (error || !success) {
      handleError(error);
      return;
    }
    const newFolder = getFolderWithId(newFolderId);
    const file = files?.find(file => file.fileId === fileId);
    handleSuccess(`"${file?.fileName}" moved to "${newFolder?.folderName}"`);
    await fetchFiles();
  };

  const handleUploadClick = () => {
    navigate(`/user/folders/${folderId}/upload`);
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-4 pb-28 sm:pb-10">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SearchBox placeholder="Search files and folders" />
          <div className="hidden shrink-0 gap-2 sm:flex">
            <Button variant="secondary" onClick={() => setCreateFolderDialogOpen(true)}>
              <FolderPlus />
              New folder
            </Button>
            <Button onClick={handleUploadClick}>
              <Upload />
              Upload
            </Button>
          </div>
        </div>

        {folderStructure && folderId && isValidFolder && <PathBar folderId={folderId} />}

        {folderStructure && folderId && isValidFolder ? (
          <FolderComponent
            folderId={folderId}
            handleEditFileName={handleEditFileName}
            handleDeleteFile={handleDeleteFile}
            handleDeleteFolder={handleDeleteFolder}
            handleEditFolderName={handleEditFolderName}
            handleMoveFile={handleMoveFile}
            onUploadClick={handleUploadClick}
            onCreateFolderClick={() => setCreateFolderDialogOpen(true)}
          />
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-12 text-center">
            <h1 className="text-lg font-semibold">Folder not found</h1>
            <p className="text-sm text-muted-foreground">
              It may have been deleted, or the link is wrong.
            </p>
            <Button variant="secondary" asChild className="mt-2">
              <a href="/user/folders/root">Go to My Storage</a>
            </Button>
          </div>
        )}
      </div>

      {/* Sticky action bar: keeps the primary actions in thumb reach on phones. */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center gap-2 border-t bg-background/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:hidden">
        <Button variant="secondary" className="flex-1" onClick={() => setCreateFolderDialogOpen(true)}>
          <FolderPlus />
          New folder
        </Button>
        <Button className="flex-1" onClick={handleUploadClick}>
          <Upload />
          Upload
        </Button>
      </div>

      <CreateFolderDialog
        open={isCreateFolderDialogOpen}
        onClose={() => setCreateFolderDialogOpen(false)}
        onCreateFolder={handleCreateFolder}
      />
    </div>
  );
};

export default MyFiles;
