import React, { ReactNode } from 'react';
import { createContext, useContext } from 'react';
import useFolderStructure from '../hooks/useFolderStructure';
import { Folder, File } from '../utils/types';

interface FolderStructureContextProps {
    folderStructure: Map<string, any>;
    updateFolderStructure: (folders: Folder[], files: File[] | null) => void;
    getFolderWithId: (folderId: string) => any
    getAllFilesWithName: (fileName: string) => File[];
    getAllFoldersWithName: (folderName: string) => Folder[];
}

const FolderStructureContext = createContext<FolderStructureContextProps | undefined>(undefined);
interface FolderStructureProviderProps {
    children: ReactNode;
}

export const FolderStructureProvider: React.FC<FolderStructureProviderProps> = ({ children }) => {
    const folderStructureApi = useFolderStructure();

    return (
        <FolderStructureContext.Provider value={folderStructureApi}>
            {children}
        </FolderStructureContext.Provider>
    );
};

export const useFolderStructureContext = (): FolderStructureContextProps => {
    const context = useContext(FolderStructureContext);

    if (!context) {
        throw new Error('useFolderStructureContext must be used within a FolderStructureProvider');
    }

    return context;
};