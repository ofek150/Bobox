import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFolderStructureContext } from '../contexts/FolderStructureContext';
import { Folder, File } from '../utils/types';
import { List, ListItem, ListItemText } from '@mui/material';
import Loading from './Loading';
import FileComponent from './FileComponent';

interface FolderComponentProps {
    folderId: string;
    navigateToFileInfo: (fileId: string) => void;
    handleEditFileName: (fileId: string, newFileName: string) => void;
    handleDeleteFile: (fileId: string) => void;
}

const FolderComponent: React.FC<FolderComponentProps> = ({ folderId, navigateToFileInfo, handleEditFileName, handleDeleteFile }) => {
    const navigate = useNavigate();
    const { folderStructure, getFolderWithId } = useFolderStructureContext();
    const [loading, setLoading] = useState(true);
    const [folder, setFolder] = useState<any>(null);

    useEffect(() => {
        if (folderId) setFolder(getFolderWithId(folderId));
    }, [folderId, folderStructure]);

    useEffect(() => {
        if (folderId) setLoading(false);
    }, [folder]);

    const renderFolderList = (head: { [key: string]: any }) => {
        const items: JSX.Element[] = [];

        const folders: any = Array.from(head.folderObjects.values());
        const files: any = Array.from(head.fileObjects.values());

        // Sort folders by createdAt
        const sortedFolders = folders.filter((folder: Folder) => folder.createdAt)
            .sort((a: Folder, b: Folder) => a.createdAt!.localeCompare(b.createdAt!));

        // Add folders to the list
        sortedFolders.forEach((folder: Folder) => {
            items.push(
                <ListItem key={folder.folderId} button onClick={() => navigate(`/user/folders/${folder.folderId}`)}>
                    <ListItemText primary={folder.folderName} secondary={`Created at: ${folder.createdAt}`} />
                </ListItem>
            );
        });

        // Sort files by uploadedAt
        const sortedFiles = files.filter((file: File) => file.uploadedAt)
            .sort((a: File, b: File) => a.uploadedAt!.localeCompare(b.uploadedAt!));

        // Add files to the list
        sortedFiles.forEach((file: File) => {
            items.push(
                <FileComponent key={file.fileId} file={file} navigateToFileInfo={navigateToFileInfo} onEditFileName={handleEditFileName} onDeleteFile={handleDeleteFile} />
            );
        });

        return items;
    };

    if (loading) {
        return <Loading />;
    }

    return (
        <>
            <List>
                {renderFolderList(folder)}
            </List>
        </>
    );
};

export default FolderComponent;
