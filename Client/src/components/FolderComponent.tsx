import React, { useEffect, useState, MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFolderStructureContext } from '../contexts/FolderStructureContext';
import { Folder, File, ShareFolderParams, Variant } from '../utils/types';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, List, ListItem, ListItemSecondaryAction, ListItemText, Menu, MenuItem, TextField, Typography } from '@mui/material';
import Loading from './Loading';
import FileComponent from './FileComponent';
import EditIcon from '@mui/icons-material/Edit';
import ShareIcon from '@mui/icons-material/Share';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { ACCESS_LEVEL } from '../utils/constants';
import { shareFolderWithUserByEmail } from '../services/firebase';
import { isValidEmail } from '../utils/validations';
import NotFoundPage from '../pages/NotFoundPage';
import { enqueueSnackbar } from 'notistack';

interface FolderComponentProps {
    folderId: string;
    navigateToFileInfo?: (ownerId: string, fileId: string) => void;
    handleEditFileName?: (fileId: string, newFileName: string) => Promise<boolean>;
    handleDeleteFile?: (fileId: string) => void;
    handleMoveFile?: (fileId: string, currentFolderId: string, newFolderId: string) => void;
    handleEditFolderName?: (folderId: string, newFolderName: string) => void;
    onFolderClick?: (folderId: string) => void;
    onFolderDoubleClick?: (folderId: string, folderName: string) => void;
    selectFolder: boolean;
}

interface FolderComponentState {
    clickedFolderId: string | null;
}

const FolderComponent: React.FC<FolderComponentProps> = ({ folderId, navigateToFileInfo, handleEditFileName, handleEditFolderName, handleDeleteFile, selectFolder, handleMoveFile, onFolderClick, onFolderDoubleClick }: FolderComponentProps) => {
    const navigate = useNavigate();
    const { folderStructure, getFolderWithId } = useFolderStructureContext();
    const [loading, setLoading] = useState(true);
    const [folder, setFolder] = useState<any>(null);
    const [invalidFolderId, setInvalidFolderId] = useState(false);
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
    const [openEditDialog, setOpenEditDialog] = useState(false);
    const [currFolderName, setCurrFolderName] = useState("");
    const [anchorPosition, setAnchorPosition] = useState<{ top: number; left: number } | null>(null);

    const [openShareDialog, setOpenShareDialog] = useState(false);
    const [shareEmail, setShareEmail] = useState('');
    const [accessLevel, setAccessLevel] = useState(ACCESS_LEVEL.ADMIN);


    const [state, setState] = useState<FolderComponentState>({
        clickedFolderId: null,
    });

    useEffect(() => {
        if (folderId) {
            const folder = getFolderWithId(folderId);
            if (!folder) {
                setInvalidFolderId(true);
                return;
            }

            setFolder(folder);
            console.log("Collaborators: ", folder.collaborators);
            setInvalidFolderId(false);
        }
    }, [folderId, folderStructure]);

    useEffect(() => {
        if (folder) setLoading(false);
    }, [folder]);

    const handleShareFolder = async (folderId: string, email: string, accessLevel: ACCESS_LEVEL) => {
        const params: ShareFolderParams = {
            email: email,
            folderId: folderId,
            accessLevel: accessLevel,
        };
        const { success, error } = await shareFolderWithUserByEmail(params);
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


    const handleShareClick = () => {
        setOpenShareDialog(true);
        handleCloseMenu();
    };

    const handleShareDialogClose = () => {
        setOpenShareDialog(false);
        setShareEmail('');
        setAccessLevel(ACCESS_LEVEL.ADMIN);
    };

    const handleShareInviteClick = () => {
        if (!state.clickedFolderId) return;
        if (!isValidEmail(shareEmail)) {
            const message = `Invalid email address: ${shareEmail}`;
            enqueueSnackbar(message, {
                variant: 'error',
                preventDuplicate: true
            });
            return;
        }

        handleShareFolder(state.clickedFolderId, shareEmail, accessLevel);
        handleShareDialogClose();
    };

    const handleEditClick = (folderId: string | null) => {
        if (!folderId) return;
        handleCloseMenu();
        const selectedFolder: Folder = getFolderWithId(folderId);
        if (!selectedFolder) return;
        setCurrFolderName(selectedFolder.folderName);
        setSelectedFolderId(folderId);
        setOpenEditDialog(true);
    };

    const handleSaveClick = () => {
        if (!selectedFolderId) return;
        if (handleEditFolderName) handleEditFolderName(selectedFolderId, currFolderName);
        setOpenEditDialog(false);
        setCurrFolderName("");
        setSelectedFolderId("");
    };

    const handleCancelClick = () => {
        setOpenEditDialog(false);
        setCurrFolderName("");
        setSelectedFolderId("");
    };

    const handleDialogInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCurrFolderName(e.target.value);
    };

    const handleFolderClick = (clickedFolderId: string) => {
        setSelectedFolderId(clickedFolderId);
        onFolderClick && onFolderClick(clickedFolderId);
    };

    const handleFolderDoubleClick = (doubleClickedFolderId: string, doubleClickedFolderName: string) => {
        onFolderDoubleClick && onFolderDoubleClick(doubleClickedFolderId, doubleClickedFolderName);
    };

    const handleContextMenu = (e: MouseEvent<HTMLDivElement>, folderId: string) => {
        e.preventDefault();
        setAnchorPosition({ top: e.clientY, left: e.clientX });
        setState({ clickedFolderId: folderId });
    };

    const handleCloseMenu = () => {
        setAnchorPosition(null);
    };

    const renderFolderList = (head: { [key: string]: any }) => {
        const items: JSX.Element[] = [];

        const folders: any = Array.from(head.folderObjects.values());
        const files: any = Array.from(head.fileObjects.values());

        // Sort folders by createdAt
        const sortedFolders = folders.filter((folder: Folder) => folder.createdAt)
            .sort((a: Folder, b: Folder) => a.createdAt!.localeCompare(b.createdAt!));

        // Add folders to the list
        sortedFolders.forEach((folder: Folder) => {
            items.push(selectFolder ? (
                <ListItem
                    key={folder.folderId}
                    // selected={selectedFolderId === folder.folderId}
                    onDoubleClick={() => handleFolderDoubleClick(folder.folderId, folder.folderName)}
                    onClick={() => handleFolderClick(folder.folderId)}
                    sx={{
                        ':hover': {
                            backgroundColor: 'rgba(0, 0, 0, 0.08)', // Change the background color on hover
                        },
                        backgroundColor: selectedFolderId === folder.folderId ? 'rgba(0, 0, 0, 0.25)' : 'inherit', // Change the background color when selected
                    }}
                >
                    <ListItemText primary={folder.folderName} />
                </ListItem>

            ) : (
                <ListItem button
                    selected={Boolean(anchorPosition)}
                    onContextMenu={(e) => { handleContextMenu(e, folder.folderId) }} key={folder.folderId} onClick={() => navigate(`/user/folders/${folder.folderId}`)}>
                    <ListItemText primary={folder.folderName} secondary={`Created at: ${folder.createdAt}`} sx={{ mr: 10 }} />
                    <ListItemSecondaryAction>
                        <IconButton edge="end" aria-label="Edit" onClick={() => handleEditClick(folder.folderId)} sx={{ mr: 1 }} >
                            <EditIcon />
                        </IconButton>
                        <div
                            role="button"
                            aria-label="More"
                            onClick={(e) => { handleContextMenu(e, folder.folderId) }}
                            onContextMenu={(e) => { handleContextMenu(e, folder.folderId) }}
                            style={{ display: 'inline' }}
                        >
                            <IconButton edge="end">
                                <MoreVertIcon />
                            </IconButton>
                        </div>
                    </ListItemSecondaryAction>
                </ListItem>
            ));
        });

        //If in folder selection mode there's no need to render the filess
        if (selectFolder) return items;

        // Sort files by uploadedAt
        const sortedFiles = files.filter((file: File) => file.uploadedAt)
            .sort((a: File, b: File) => a.uploadedAt!.localeCompare(b.uploadedAt!));

        // Add files to the list
        sortedFiles.forEach((file: File) => {
            items.push(
                <FileComponent key={file.fileId} file={file} navigateToFileInfo={navigateToFileInfo!} onEditFileName={handleEditFileName!} onDeleteFile={handleDeleteFile!} onMoveFile={handleMoveFile!} />
            );
        });

        return items;
    };

    if (invalidFolderId) return <NotFoundPage />;

    if (loading) {
        return <Loading />;
    }

    return (
        <Box sx={{ width: '60%' }}>
            {!selectFolder &&
                < Typography variant="h4" gutterBottom sx={{ fontWeight: 700, my: 8, textAlign: 'center' }}>
                    {
                        folder
                            ? folder.folderId === "root"
                                ? "My Storage"
                                : folder.folderId === "shared"
                                    ? "Shared Storage"
                                    : folder.folderName // Or folder.name if you prefer
                            : null // Adjust this part based on how you want to handle the case when 'folder' is undefined or null
                    }
                </Typography>
            }


            <List>
                {renderFolderList(folder)}
            </List>

            <Menu
                open={Boolean(anchorPosition)}
                onClose={handleCloseMenu}
                anchorReference="anchorPosition"
                anchorPosition={anchorPosition as { top: number; left: number }}
            >
                <MenuItem onClick={() => { handleEditClick(state.clickedFolderId) }}>
                    <EditIcon fontSize="small" sx={{ mr: 1 }} />
                    Edit
                </MenuItem>
                <MenuItem onClick={handleShareClick}>
                    <ShareIcon fontSize="small" sx={{ mr: 1 }} />
                    Share
                </MenuItem>
            </Menu>

            <Dialog open={openEditDialog} onClose={handleCancelClick}>
                <DialogTitle>Edit Folder Name</DialogTitle>
                <DialogContent>
                    <TextField
                        value={currFolderName}
                        onChange={handleDialogInputChange}
                        autoFocus
                        fullWidth
                    />
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
        </Box >
    );
};

export default FolderComponent;
