import React, { useEffect, useState } from "react";
import { useFolderStructureContext } from "../../contexts/FolderStructureContext";
import { useNavigate } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { Box, Button, List, ListItem, MenuItem, Popover, Typography } from "@mui/material";
import { auth } from "../../services/firebase";
import FolderIcon from "@mui/icons-material/Folder";

interface PathBarProps {
    folderId: string;
    fileId?: string | null;
}

interface FolderObject {
    folderId: string;
    folderName: string;
}

const PathBar: React.FC<PathBarProps> = ({ folderId, fileId = null }) => {
    const [user] = useAuthState(auth);
    const { getFolderWithId } = useFolderStructureContext();
    const [folderPathObjects, setFolderPathObjects] = useState<FolderObject[]>([]);
    const [lastThreeFolders, setLastThreeFolders] = useState<FolderObject[]>([]);
    const [popoverAnchor, setPopoverAnchor] = useState<HTMLButtonElement | null>(null);

    const handleEllipsisClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setPopoverAnchor(event.currentTarget);
    };

    const handlePopoverClose = () => {
        setPopoverAnchor(null);
    };

    const navigate = useNavigate();

    const navigateToFolder = (folderId: string) => {
        navigate(`/user/folders/${folderId}`);
    }

    const getFolderPathObjects = (folderId: string): FolderObject[] => {
        const folderObjects: FolderObject[] = [];

        const populateFolderObjects = (currentFolderId: string) => {
            const folder = getFolderWithId(currentFolderId);
            if (folder) {
                let folderName = folder.folderName;
                if (currentFolderId === 'root') folderName = 'My Storage';
                else if (currentFolderId === 'shared') folderName = 'Shared Storage';

                folderObjects.unshift({ folderId: currentFolderId, folderName });

                if (folder.parentFolderId) {
                    populateFolderObjects(folder.parentFolderId);
                }
            }
        };

        populateFolderObjects(folderId);

        return folderObjects;
    };

    useEffect(() => {
        const parentFolderId = getFolderWithId(folderId)?.parentFolderId;
        const folderPathObjects = getFolderPathObjects(parentFolderId);
        setFolderPathObjects(folderPathObjects);
        setLastThreeFolders(folderPathObjects.slice(-3))
    }, [folderId])


    return (
        <List sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', listStyle: 'none', padding: 0 }}>
            {folderPathObjects.length > 3 && (
                <ListItem key={"ellipsis"}>
                    <Button variant='text' onClick={handleEllipsisClick} sx={{ fontSize: '1.2rem', textTransform: 'none', fontWeight: 500 }}>
                        ...
                    </Button>
                    <Typography sx={{ fontSize: '1.5rem', fontWeight: 500, ml: 1 }}>/</Typography>
                    <Popover
                        open={Boolean(popoverAnchor)}
                        anchorEl={popoverAnchor}
                        onClose={handlePopoverClose}
                        anchorOrigin={{
                            vertical: 'bottom',
                            horizontal: 'center',
                        }}
                        transformOrigin={{
                            vertical: 'top',
                            horizontal: 'center',
                        }}
                    >
                        {folderPathObjects.slice(0, folderPathObjects.length - 3).map((folderPathObject: FolderObject) => (
                            <MenuItem key={folderPathObject.folderId} onClick={() => { navigateToFolder(folderPathObject.folderId); handlePopoverClose(); }} sx={{ fontWeight: 500 }}>
                                <FolderIcon style={{ marginRight: "8px" }} />
                                {folderPathObject.folderName}
                            </MenuItem>
                        ))}
                    </Popover>
                </ListItem>
            )}
            {lastThreeFolders.map((folderPathObject: FolderObject, index: number) => (
                <React.Fragment key={folderPathObject.folderId}>
                    <ListItem key={folderPathObject.folderId}>
                        <Button key={folderPathObject.folderId + "_button"} variant='text' onClick={() => { navigateToFolder(folderPathObject.folderId) }} sx={{ fontSize: '1.3rem', fontWeight: 700, textTransform: 'none', padding: '0.2rem', whiteSpace: 'nowrap' }}>
                            {folderPathObject.folderName}
                        </Button>
                    </ListItem>
                    <ListItem key={folderPathObject.folderId + "_selector"}>
                        {index < lastThreeFolders.length - 1 && (
                            <Typography sx={{ fontSize: '1.5rem', fontWeight: 500 }}>/</Typography>
                        )}
                    </ListItem>
                </React.Fragment>
            ))}

        </List>
    );

};

export default PathBar;
