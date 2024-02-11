import { useEffect, useState } from 'react';
import { Folder, File } from '../utils/types';

const useFolderStructure = () => {
    const [folderStructure, setFolderStructure] = useState<Map<string, any>>(new Map());
    const [update, setUpdate] = useState(false);

    const transformData = (folders: Folder[], files: File[] | null) => {
        const folderMap: Map<string, any> = new Map();

        const processFolder = (folder: Folder) => {
            const folderObject = {
                ...folder,
                fileObjects: [] as File[],
                folderObjects: [] as Folder[],
            };

            if (files) {
                const folderFiles = files.filter((file) => file.folderId === folder.folderId);
                folderFiles.forEach((file: File) => {
                    folderObject.fileObjects.push(file);
                });
            }
            // Add subfolders to the folderObject
            const subfolders = folders.filter((subfolder) => subfolder.inFolder === folder.folderId);
            subfolders.forEach((subfolder) => {
                folderObject.folderObjects.push(subfolder);
            });

            return folderObject;
        };

        folders.forEach((folder) => {

            const folderObject = processFolder(folder);
            folderMap.set(folder.folderId, folderObject);
        });

        return folderMap;
    };

    const updateFolderStructure = (folders: Folder[], files: File[] | null) => {
        if (!folders) return;
        const folderMap = transformData(folders, files);
        setFolderStructure(new Map(folderMap));
        setUpdate(!update);
    };

    const getFolderWithId = (folderId: string) => {
        return folderStructure.get(folderId) || null;
    };

    useEffect(() => {
        console.log("Folder structure after update: ", folderStructure);
    }, [folderStructure]);

    return { folderStructure, updateFolderStructure, getFolderWithId };
};

export default useFolderStructure;
