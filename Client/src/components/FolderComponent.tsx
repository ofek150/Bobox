import React, { useEffect, useState, MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFolderStructureContext } from '../contexts/FolderStructureContext';
import { Folder, File, ShareFolderParams, Variant } from '../utils/types';
import { Box, Button, Card, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, List, ListItem, ListItemSecondaryAction, ListItemText, Menu, MenuItem, TextField, Typography } from '@mui/material';
import Loading from './Loading';
import FileComponent from './FileComponent';
import FolderIcon from "@mui/icons-material/Folder";
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ShareIcon from '@mui/icons-material/Share';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { ACCESS_LEVEL, FILTER_ITEMS_TYPE, SORT_TYPE, ITEM_TYPE } from '../utils/constants';
import { shareFolderWithUserByEmail } from '../services/firebase';
import { isValidEmail } from '../utils/validations';
import NotFoundPage from '../pages/NotFoundPage';
import { enqueueSnackbar } from 'notistack';
import FilterBar from './UI/FilterBar';
import ArrowBackIcon from '@mui/icons-material/ArrowBackIos';

interface FolderComponentProps {
    folderId: string;
    handleEditFileName?: (fileId: string, newFileName: string) => Promise<boolean>;
    handleDeleteFile?: (fileId: string) => void;
    handleMoveFile?: (fileId: string, currentFolderId: string, newFolderId: string) => void;
    handleEditFolderName?: (folderId: string, newFolderName: string) => void;
    handleDeleteFolder?: (folderId: string) => void;
    onFolderClick?: (folderId: string) => void;
    onFolderDoubleClick?: (folderId: string, folderName: string) => void;
    selectFolder: boolean;
}

interface FolderComponentState {
    clickedFolderId: string | null;
}

const FolderComponent: React.FC<FolderComponentProps> = ({ folderId, handleEditFileName, handleEditFolderName, handleDeleteFile, handleDeleteFolder, selectFolder, handleMoveFile, onFolderClick, onFolderDoubleClick }: FolderComponentProps) => {
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

    const [sortType, setSortType] = useState<SORT_TYPE>(SORT_TYPE.BY_DATE_DESC);
    const [filterItemType, setFilterItemType] = useState<FILTER_ITEMS_TYPE>(FILTER_ITEMS_TYPE.BOTH);

    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

    const handleGoBack = () => {
        navigate(-1);
    };


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



    const handleDeleteClick = (folderId: string | null) => {
        if (!folderId) return;
        handleCloseMenu();
        const selectedFolder: Folder = getFolderWithId(folderId);
        if (!selectedFolder) return;
        setCurrFolderName(selectedFolder.folderName);
        setSelectedFolderId(folderId);
        setOpenDeleteDialog(true);
    };

    const handleDeleteConfirmation = () => {
        if (handleDeleteFolder && selectedFolderId) {
            handleDeleteFolder(selectedFolderId);
            setOpenDeleteDialog(false);
        }
    };

    const handleCancelDelete = () => {
        setOpenDeleteDialog(false);
    };

    const renderFolderList = (head: { [key: string]: any }) => {
        const items: JSX.Element[] = [];

        const folders: any = Array.from(head.folderObjects.values());
        const files: any = Array.from(head.fileObjects.values());
        const allItems: any = selectFolder ? [...folders] : [...folders, ...files];


        const allItemsWithType = allItems
            .filter((item: any) => {
                if (filterItemType === FILTER_ITEMS_TYPE.FOLDERS_ONLY) {
                    return !files.includes(item);
                } else if (filterItemType === FILTER_ITEMS_TYPE.FILES_ONLY) {
                    return !folders.includes(item);
                }
                return true; // Include both folders and files when filterItemType is not specified
            })
            .map((item: any) => {
                if (folders.includes(item)) {
                    return { ...item, type: ITEM_TYPE.FOLDER };
                } else if (files.includes(item)) {
                    return { ...item, type: ITEM_TYPE.FILE };
                } else {
                    return item;
                }
            });

        switch (sortType) {
            case SORT_TYPE.BY_NAME_DESC:
                allItemsWithType.sort((a: any, b: any) => {
                    const aName = a.type === ITEM_TYPE.FOLDER ? a.folderName : a.fileName;
                    const bName = b.type === ITEM_TYPE.FOLDER ? b.folderName : b.fileName;
                    return aName.localeCompare(bName);
                });
                break;
            case SORT_TYPE.BY_NAME_ASC:
                allItemsWithType.sort((a: any, b: any) => {
                    const aName = a.type === ITEM_TYPE.FOLDER ? a.folderName : a.fileName;
                    const bName = b.type === ITEM_TYPE.FOLDER ? b.folderName : b.fileName;
                    return bName.localeCompare(aName);
                });
                break;
            case SORT_TYPE.BY_DATE_DESC:
                allItemsWithType.sort((a: any, b: any) => {
                    const aDate = a.type === ITEM_TYPE.FOLDER ? a.createdAt : a.uploadedAt;
                    const bDate = b.type === ITEM_TYPE.FOLDER ? b.createdAt : b.uploadedAt;
                    return aDate.localeCompare(bDate);
                });
                break;
            case SORT_TYPE.BY_DATE_ASC:
                allItemsWithType.sort((a: any, b: any) => {
                    const aDate = a.type === ITEM_TYPE.FOLDER ? a.createdAt : a.uploadedAt;
                    const bDate = b.type === ITEM_TYPE.FOLDER ? b.createdAt : b.uploadedAt;
                    return bDate.localeCompare(aDate);
                });
                break;
        }



        allItemsWithType.forEach((item: any) => {

            if (selectFolder && item.type === ITEM_TYPE.FILE) return;
            items.push(selectFolder ? (
                <ListItem
                    key={item.folderId}
                    // selected={selectedFolderId === folder.folderId}
                    onDoubleClick={() => handleFolderDoubleClick(item.folderId, item.folderName)}
                    onClick={() => handleFolderClick(item.folderId)}
                    sx={{
                        ':hover': {
                            backgroundColor: 'rgba(0, 0, 0, 0.08)', // Change the background color on hover
                        },
                        width: '100%',
                        backgroundColor: selectedFolderId === item.folderId ? 'rgba(0, 0, 0, 0.25)' : 'inherit', // Change the background color when selected
                    }}
                >
                    <FolderIcon style={{ marginRight: "8px" }} />
                    <ListItemText primary={item.folderName} />
                </ListItem>

            ) : item.type === ITEM_TYPE.FOLDER ? (
                <Card sx={{ mb: '0.8rem' }}>
                    <ListItem button
                        //selected={Boolean(anchorPosition)}
                        onContextMenu={(e) => { handleContextMenu(e, item.folderId) }} key={item.folderId} onClick={() => navigate(`/user/folders/${item.folderId}`)}>
                        <FolderIcon style={{ marginRight: "8px" }} />
                        <ListItemText primary={item.folderName} secondary={`Created at: ${item.createdAt}`} sx={{ mr: 10 }} />
                        <ListItemSecondaryAction>
                            <IconButton edge="end" aria-label="Edit" onClick={() => handleEditClick(item.folderId)}>
                                <EditIcon />
                            </IconButton>
                            <IconButton edge="end" aria-label="Delete" onClick={() => handleDeleteClick(item.folderId)} sx={{ ml: 1.2, mr: 1 }}>
                                <DeleteIcon />
                            </IconButton>
                            <div
                                role="button"
                                aria-label="More"
                                onClick={(e) => { handleContextMenu(e, item.folderId) }}
                                onContextMenu={(e) => { handleContextMenu(e, item.folderId) }}
                                style={{ display: 'inline' }}
                            >
                                <IconButton edge="end">
                                    <MoreVertIcon />
                                </IconButton>
                            </div>
                        </ListItemSecondaryAction>
                    </ListItem>
                </Card>
            ) : (
                <FileComponent key={item.fileId} file={item as File} handleEditFileName={handleEditFileName!} handleDeleteFile={handleDeleteFile!} handleMoveFile={handleMoveFile!} />
            ))
        });


        return items;
    }
    if (invalidFolderId) return <NotFoundPage />;

    if (loading) {
        return <Loading />;
    }

    return (
        <Box>
            {!selectFolder && (
                <Box sx={{ display: 'flex', alignItems: 'flex-end', mb: 4, justifyContent: 'center' }}>
                    <IconButton onClick={handleGoBack} sx={{ color: 'primary.main', mr: 1 }}>
                        <ArrowBackIcon />
                    </IconButton>
                    <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, mt: 2, mb: 0, textAlign: 'center' }}>
                        {folder
                            ? folder.folderId === 'root'
                                ? 'My Storage'
                                : folder.folderId === 'shared'
                                    ? 'Shared Storage'
                                    : folder.folderName
                            : null}
                    </Typography>
                </Box>

            )}
            {!selectFolder && <FilterBar setType={setFilterItemType} setSortBy={setSortType} sortBy={sortType} filterType={filterItemType} />}
            <List>
                {renderFolderList(folder)}
            </List>

            <Menu
                open={Boolean(anchorPosition)}
                onClose={handleCloseMenu}
                anchorReference="anchorPosition"
                anchorPosition={anchorPosition as { top: number; left: number }}
            >
                <MenuItem onClick={() => handleEditClick(state.clickedFolderId)}>
                    <EditIcon fontSize="small" sx={{ mr: 1 }} />
                    Edit Folder Name
                </MenuItem>
                <MenuItem onClick={() => handleDeleteClick(state.clickedFolderId)}>
                    <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
                    Delete
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
                <DialogTitle>Add Collaborators</DialogTitle>
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

            {/* Delete Dialog */}
            <Dialog open={openDeleteDialog} onClose={handleCancelDelete}>
                <DialogTitle>Confirm Deletion</DialogTitle>
                <DialogContent>
                    <p>Are you sure you want to delete this folder?</p>
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
        </Box >
    );
};

export default FolderComponent;
