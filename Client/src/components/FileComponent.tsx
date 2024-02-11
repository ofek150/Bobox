import React, { useEffect, useState, MouseEvent } from 'react';
import {
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    IconButton,
    Menu,
    MenuItem,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    ListItemButton,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DriveFileMove from '@mui/icons-material/DriveFileMove';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { formatFileSize } from '../utils/helpers';
import { File, ShareFileParams, Variant } from '../utils/types';
import MoveToFileFolderDialog from './MoveFileOrFolderDialog';
import { shareFileWithUserByEmail } from '../services/firebase';
import { ACCESS_LEVEL } from '../utils/constants';
import Notification from '../components/UI/Notification';


interface FileComponentProps {
    file: File;
    navigateToFileInfo: (ownerId: string, fileId: string) => void;
    onEditFileName: (fileId: string, newFileName: string) => void;
    onDeleteFile: (fileId: string) => void;
    onMoveFile: (fileId: string, currentFolderId: string, newFolderId: string) => void;
}

const FileComponent: React.FC<FileComponentProps> = ({
    file,
    navigateToFileInfo,
    onEditFileName,
    onDeleteFile,
    onMoveFile,
}: FileComponentProps) => {
    const [isEditing, setEditing] = useState(false);
    const [fileNameWithoutExtension, setFileNameWithoutExtension] = useState('');
    const [openEditDialog, setOpenEditDialog] = useState(false);
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [openMoveToFolderDialog, setOpenMoveToFolderDialog] = useState(false);
    const [anchorPosition, setAnchorPosition] = useState<{ top: number; left: number } | null>(null);
    const [openShareDialog, setOpenShareDialog] = useState(false);
    const [shareEmail, setShareEmail] = useState('');
    const [accessLevel, setAccessLevel] = useState(ACCESS_LEVEL.ADMIN);
    const [notification, setNotification] = useState<string | null>(null);
    const [notificationVariant, setNotificationVariant] = useState<Variant>(undefined);

    const fileExtension = file.fileName.split('.').pop();

    useEffect(() => {
        const parts = file.fileName.split('.');
        parts.pop(); // Remove the last element (file extension)
        setFileNameWithoutExtension(parts.join('.'));
    }, [file]);

    const handleItemClick = () => {
        navigateToFileInfo(file.ownerUid, file.fileId);
    };

    const handleContextMenu = (e: MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        setAnchorPosition({ top: e.clientY, left: e.clientX });
    };

    const handleCloseMenu = () => {
        setAnchorPosition(null);
    };

    const handleEditClick = () => {
        handleCloseMenu();
        setOpenEditDialog(true);
    };

    const handleSaveClick = () => {
        setEditing(false);
        const updatedFileName = fileNameWithoutExtension + (fileExtension ? '.' + fileExtension : '');
        onEditFileName(file.fileId, updatedFileName);
        setOpenEditDialog(false);
    };

    const handleCancelClick = () => {
        setEditing(false);
        setOpenEditDialog(false);
    };

    const handleDeleteClick = () => {
        setOpenDeleteDialog(true);
        handleCloseMenu();
    };

    const handleDeleteConfirmation = () => {
        onDeleteFile(file.fileId);
        setOpenDeleteDialog(false);
    };

    const handleCancelDelete = () => {
        setOpenDeleteDialog(false);
    };

    const handleMoveClick = () => {
        setOpenMoveToFolderDialog(true);
        handleCloseMenu();
    };

    const handleShareFile = async (email: string, accessLevel: ACCESS_LEVEL) => {
        const params: ShareFileParams = {
            email: email,
            fileId: file.fileId,
            accessLevel: accessLevel,
        };
        const { success, error } = await shareFileWithUserByEmail(params);

        if (success) {
            setNotification('User has been invited. Please check your email for the invitation.');
            setNotificationVariant('success');
        } else {
            setNotification(`Error inviting user: ${error}`);
            setNotificationVariant('error');
        }

        setTimeout(() => {
            setNotification(null);
        }, 3000);
    };


    const handleDialogInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFileNameWithoutExtension(e.target.value);
    };

    const handleShareClick = () => {
        setOpenShareDialog(true);
        handleCloseMenu();
    };

    const handleShareDialogClose = () => {
        setOpenShareDialog(false);
        setShareEmail('');
        setAccessLevel(ACCESS_LEVEL.ADMIN); // Reset access level to default
    };

    const handleShareInviteClick = () => {
        // Validate email and other necessary checks before inviting
        handleShareFile(shareEmail, accessLevel);
        handleShareDialogClose();
    };

    return (
        <>
            <ListItem
                button
                onContextMenu={handleContextMenu}
                onClick={handleItemClick}
                selected={Boolean(anchorPosition)}
            >
                <ListItemText
                    primary={file.fileName}
                    secondary={`Size: ${formatFileSize(file.fileSize)} | Uploaded At: ${file.uploadedAt}`}
                    sx={{ mr: 10 }}
                />
                <ListItemSecondaryAction>
                    <IconButton edge="end" aria-label="Edit" onClick={handleEditClick}>
                        <EditIcon />
                    </IconButton>
                    <IconButton edge="end" aria-label="Delete" onClick={handleDeleteClick} sx={{ ml: 1.2 }}>
                        <DeleteIcon />
                    </IconButton>
                    <IconButton edge="end" aria-label="Move to Folder" onClick={handleMoveClick} sx={{ ml: 1.2, mr: 1 }}>
                        <DriveFileMove />
                    </IconButton>
                    <div
                        role="button"
                        aria-label="More"
                        onClick={(e: React.MouseEvent<HTMLDivElement>) => handleContextMenu(e)}
                        onContextMenu={(e: React.MouseEvent<HTMLDivElement>) => handleContextMenu(e)}
                        style={{ display: 'inline' }}
                    >
                        <IconButton edge="end">
                            <MoreVertIcon />
                        </IconButton>
                    </div>
                </ListItemSecondaryAction>
            </ListItem>

            {notification && <Notification message={notification} variant='error' />}

            <Menu
                open={Boolean(anchorPosition)}
                onClose={handleCloseMenu}
                anchorReference="anchorPosition"
                anchorPosition={anchorPosition as { top: number; left: number }}
            >
                <MenuItem onClick={handleEditClick}>
                    <EditIcon fontSize="small" sx={{ mr: 1 }} />
                    Edit
                </MenuItem>
                <MenuItem onClick={handleDeleteClick}>
                    <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
                    Delete
                </MenuItem>
                <MenuItem onClick={handleMoveClick}>
                    <DriveFileMove fontSize="small" sx={{ mr: 1 }} />
                    Move
                </MenuItem>
                <MenuItem onClick={handleShareClick}>
                    <MoreVertIcon fontSize="small" sx={{ mr: 1 }} />
                    Share
                </MenuItem>
            </Menu>

            {/* Share Dialog */}
            <Dialog open={openShareDialog} onClose={handleShareDialogClose}>
                <DialogTitle>Share File</DialogTitle>
                <DialogContent>
                    <TextField
                        label="Email"
                        type="email"
                        fullWidth
                        value={shareEmail}
                        onChange={(e) => setShareEmail(e.target.value)}
                        sx={{ mb: 2, mt: 1 }}
                    />
                    <TextField
                        label="Access Level"
                        select
                        fullWidth
                        value={accessLevel}
                        onChange={(e: React.ChangeEvent<{ value: unknown }>) => setAccessLevel(e.target.value as ACCESS_LEVEL)}

                    >
                        <MenuItem value={ACCESS_LEVEL.ADMIN}>Admin</MenuItem>
                        <MenuItem value={ACCESS_LEVEL.OPERATOR}>Operator</MenuItem>
                        <MenuItem value={ACCESS_LEVEL.VIEWER}>Viewer</MenuItem>
                    </TextField>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleShareDialogClose} color="secondary">
                        Cancel
                    </Button>
                    <Button onClick={handleShareInviteClick} color="primary">
                        Invite
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={openEditDialog} onClose={handleCancelClick}>
                <DialogTitle>Edit File Name</DialogTitle>
                <DialogContent>
                    <TextField value={fileNameWithoutExtension} onChange={handleDialogInputChange} autoFocus fullWidth />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCancelClick} color="secondary">
                        Cancel
                    </Button>
                    <Button onClick={handleSaveClick} color="primary">
                        Save
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={openDeleteDialog} onClose={handleCancelDelete}>
                <DialogTitle>Confirm Deletion</DialogTitle>
                <DialogContent>
                    <p>Are you sure you want to delete this file?</p>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCancelDelete} color="secondary">
                        Cancel
                    </Button>
                    <Button onClick={handleDeleteConfirmation} color="primary">
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Move to Folder Dialog */}
            <MoveToFileFolderDialog
                open={openMoveToFolderDialog}
                onClose={() => setOpenMoveToFolderDialog(false)}
                onMoveFile={onMoveFile}
                file={file}
            />
        </>
    );
};

export default FileComponent;