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
    FormControlLabel,
    Typography,
    Box,
    Select,
    OutlinedInput,
    Checkbox,
    Divider,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DriveFileMove from '@mui/icons-material/DriveFileMove';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ShareIcon from '@mui/icons-material/Share';
import DescriptionIcon from "@mui/icons-material/Description";
import { formatFileSize } from '../utils/helpers';
import { File, GenerateDownloadLinkParams, ShareFileParams, Variant } from '../utils/types';
import MoveToFileFolderDialog from './MoveFileOrFolderDialog';
import { generatePublicDownloadLink, shareFileWithUserByEmail } from '../services/firebase';
import { ACCESS_LEVEL } from '../utils/constants';
import { isValidEmail } from '../utils/validations';
import { enqueueSnackbar } from 'notistack';
import { useNavigate } from 'react-router-dom';


interface FileComponentProps {
    file: File;
    handleEditFileName: ((fileId: string, newFileName: string) => Promise<boolean>);
    handleDeleteFile: (fileId: string) => void;
    handleMoveFile: (fileId: string, currentFolderId: string, newFolderId: string) => void;
}

const FileComponent: React.FC<FileComponentProps> = ({
    file,
    handleEditFileName,
    handleDeleteFile,
    handleMoveFile,
}: FileComponentProps) => {
    const [fileNameWithoutExtension, setFileNameWithoutExtension] = useState('');
    const [displayedFileName, setDisplayedFileName] = useState(file.fileName);
    const [openEditDialog, setOpenEditDialog] = useState(false);
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [openMoveToFolderDialog, setOpenMoveToFolderDialog] = useState(false);
    const [anchorPosition, setAnchorPosition] = useState<{ top: number; left: number } | null>(null);
    const [openShareDialog, setOpenShareDialog] = useState(false);
    const [shareEmail, setShareEmail] = useState('');
    const [accessLevel, setAccessLevel] = useState(ACCESS_LEVEL.ADMIN);
    const navigate = useNavigate();

    const [expiryDays, setExpiryDays] = useState<number>(1);
    const [neverExpires, setNeverExpires] = useState(false);
    const [generatingLink, setGeneratingLink] = useState(false);
    const [expiryDate, setExpiryDate] = useState<Date | null>(null);
    const [shareLink, setShareLink] = useState<string | null>(null);

    const fileExtension = file.fileName.split('.').pop();

    useEffect(() => {
        const parts = file.fileName.split('.');
        parts.pop(); // Remove the last element (file extension)
        setFileNameWithoutExtension(parts.join('.'));
    }, [file]);

    useEffect(() => {
        if (!neverExpires) {
            const newExpiryDate = new Date();
            newExpiryDate.setDate(newExpiryDate.getDate() + expiryDays);
            setExpiryDate(newExpiryDate);
        }
    }, [expiryDays, neverExpires]);

    const handleItemClick = () => {
        console.log("Owner uid: ", file.ownerUid);
        const link = `/user/${file.ownerUid}/files/${file.fileId}?downloadId=${file.privateLinkDownloadId}`;
        navigate(link);
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

    const handleSaveClick = async () => {
        const updatedFileName = fileNameWithoutExtension + (fileExtension ? '.' + fileExtension : '');
        setOpenEditDialog(false);
        setDisplayedFileName(updatedFileName);
        if (!await handleEditFileName(file.fileId, updatedFileName)) {
            const parts = file.fileName.split('.');
            parts.pop();
            setFileNameWithoutExtension(parts.join('.'));
            setDisplayedFileName(file.fileName);
        }
    };

    const handleCancelClick = () => {
        setOpenEditDialog(false);
    };

    const handleDeleteClick = () => {
        setOpenDeleteDialog(true);
        handleCloseMenu();
    };

    const handleDeleteConfirmation = () => {
        handleDeleteFile(file.fileId);
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

        let message = "";
        let variant: Variant = undefined;
        if (success) {
            message = 'User has been invited. Please check your email for the invitation.';
            variant = 'success';
        } else {
            message = `Error inviting user: ${error}`
            variant = 'error';
        }
        enqueueSnackbar(message, {
            variant: variant,
            preventDuplicate: true
        });
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
        setAccessLevel(ACCESS_LEVEL.ADMIN);
        setNeverExpires(false);
        setExpiryDays(1);
    };

    const handleShareInviteClick = () => {
        if (!isValidEmail(shareEmail)) {
            const message = `Invalid email address: ${shareEmail}`;
            enqueueSnackbar(message, {
                variant: 'error',
                preventDuplicate: true
            });
            return;
        }

        handleShareFile(shareEmail, accessLevel);
        handleShareDialogClose();
    };

    const getNextWeekDate = () => {
        const today = new Date();
        const nextWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7);
        return nextWeek;
    }

    const handleGenerateDownloadLink = async () => {
        setGeneratingLink(true);
        const generateDownloadLinkParams: GenerateDownloadLinkParams = {
            fileId: file.fileId,
            neverExpires: neverExpires,
            expiresAt: neverExpires ? null : expiryDate ? expiryDate : getNextWeekDate(),
        };
        const { link, error } = await generatePublicDownloadLink(generateDownloadLinkParams);
        if (error) {
            setGeneratingLink(false);
            return;
        }
        setShareLink(link);
        console.log('shareLink:', link);
        setGeneratingLink(false);
    }

    const copyLink = () => {
        if (!shareLink) return;
        navigator.clipboard.writeText(shareLink).then(() => {
            console.log('Link copied to clipboard:', shareLink);
        });
    }

    return (
        <>
            <ListItem
                button
                onContextMenu={handleContextMenu}
                onClick={handleItemClick}
                selected={Boolean(anchorPosition)}
            >
                <DescriptionIcon style={{ marginRight: "8px" }} />
                <ListItemText
                    primary={displayedFileName}
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

            <Menu
                open={Boolean(anchorPosition)}
                onClose={handleCloseMenu}
                anchorReference="anchorPosition"
                anchorPosition={anchorPosition as { top: number; left: number }}
            >
                <MenuItem onClick={handleEditClick}>
                    <EditIcon fontSize="small" sx={{ mr: 1 }} />
                    Edit File Name
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
                    <ShareIcon fontSize="small" sx={{ mr: 1 }} />
                    Share
                </MenuItem>
            </Menu>

            {/* Share Dialog */}
            <Dialog open={openShareDialog} onClose={handleShareDialogClose}>
                <DialogTitle>Share File</DialogTitle>
                <DialogContent>
                    {/* Collaborators Section */}
                    <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 500, fontSize: '1.1rem' }}>
                        Add Collaborators
                    </Typography>
                    <TextField
                        label="Email"
                        type="email"
                        fullWidth
                        value={shareEmail}
                        onChange={(e) => setShareEmail(e.target.value)}
                        sx={{ mb: 2 }}
                    />
                    <TextField
                        label="Access Level"
                        select
                        fullWidth
                        value={accessLevel}
                        onChange={(e: React.ChangeEvent<{ value: unknown }>) => setAccessLevel(e.target.value as ACCESS_LEVEL)}
                        sx={{ mb: 2 }}
                    >
                        <MenuItem value={ACCESS_LEVEL.ADMIN}>Admin</MenuItem>
                        <MenuItem value={ACCESS_LEVEL.OPERATOR}>Operator</MenuItem>
                        <MenuItem value={ACCESS_LEVEL.VIEWER}>Viewer</MenuItem>
                    </TextField>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleShareInviteClick}
                        sx={{ mb: 2, mt: 2, display: 'block', margin: 'auto' }}
                    >
                        Invite Collaborator
                    </Button>

                    {/* Divider */}
                    <Divider sx={{ my: 2 }} />

                    {/* Public Link Section */}
                    <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 500, fontSize: '1.1rem' }}>
                        Create Public Link
                    </Typography>
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={neverExpires}
                                onChange={(e) => setNeverExpires(e.target.checked)}
                                color="primary"
                            />
                        }
                        label="Never Expires"
                        sx={{ mb: 2 }}
                    />
                    {!shareLink && (
                        <>
                            {!neverExpires && (
                                <Box sx={{ mb: 2 }}>
                                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                        Link expiry days
                                    </Typography>
                                    <Select
                                        value={expiryDays}
                                        onChange={(e) => setExpiryDays(e.target.value as number)}
                                        displayEmpty
                                        input={<OutlinedInput label="Link expiry days" />}
                                        sx={{ width: "100%" }}
                                    >
                                        {[1, 2, 3, 4, 5, 6, 7].map((days) => (
                                            <MenuItem key={days} value={days}>
                                                {days} day{days !== 1 ? "s" : ""}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </Box>
                            )}

                            <Button
                                variant="contained"
                                color="primary"
                                onClick={handleGenerateDownloadLink}
                                sx={{ mb: 2, mt: 2, display: 'block', margin: 'auto' }}
                            >
                                Generate Public Link
                            </Button>
                        </>
                    )}

                    {/* Display the generated download link */}
                    {shareLink && (
                        <>
                            <Typography variant="subtitle2" color="textPrimary" sx={{ mb: 2, mt: 2, textAlign: 'center' }}>
                                Share this link with others to view the uploaded file.
                            </Typography>
                            <Button variant="outlined" onClick={copyLink} sx={{ display: 'block', margin: 'auto' }}>
                                Copy link to Clipboard
                            </Button>
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleShareDialogClose} color="secondary">
                        Cancel
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
                onMoveFile={handleMoveFile}
                file={file}
            />
        </>
    );
};

export default FileComponent;