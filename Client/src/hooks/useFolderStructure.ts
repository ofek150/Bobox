import { useEffect, useState } from "react";
import { Folder, File } from "../utils/types";

const useFolderStructure = () => {
  const [folderStructure, setFolderStructure] = useState<Map<string, any>>(
    new Map()
  );
  const [files, setFiles] = useState<File[] | null>([]);
  const [update, setUpdate] = useState(false);

  const transformData = (folders: Folder[], files: File[] | null) => {
    const folderMap: Map<string, any> = new Map();
    const folderIds: string[] = folders.map(folder => folder.folderId);

    files = files ? files?.map((file) => {
      if (!folderIds.includes(file.parentFolderId) && file.shared)
        return { ...file, parentFolderId: "shared" };
      return file;
    }) : [];


    const processFolder = (folder: Folder) => {
      const folderObject = {
        ...folder,
        fileObjects: [] as File[],
        folderObjects: [] as Folder[],
      };

      if ((!folderIds.includes(folder.parentFolderId) || folder.parentFolderId === "root") && folder.shared && folder.folderId != 'shared') folder.parentFolderId = "shared";

      // Add files to the folderObject
      if (files) {
        const folderFiles = files.filter(
          (file) => file.parentFolderId === folder.folderId
        );
        folderFiles.forEach((file: File) => {
          folderObject.fileObjects.push(file);
        });
      }
      // Add subfolders to the folderObject
      const subfolders = folders.filter(
        (subfolder) => subfolder.parentFolderId === folder.folderId
      );
      subfolders.forEach((subfolder) => {
        folderObject.folderObjects.push(subfolder);
      });

      return folderObject;
    };

    folders.forEach((folder) => {
      const folderObject = processFolder(folder);
      folderMap.set(folder.folderId, folderObject);
    });
    console.log(files);

    setFiles(files);
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

  const getAllFilesWithName = (fileName: string) => {
    const filesList: File[] = [];
    files?.forEach((file) => {
      if (file.fileName.toLowerCase().startsWith(fileName.toLowerCase())) {
        filesList?.push(file);
      }
    });
    return filesList;
  };

  const getAllFoldersWithName = (folderName: string) => {
    const foldersList: Folder[] = [];
    folderStructure.forEach((folder) => {
      if (folder.folderName.toLowerCase().startsWith(folderName.toLowerCase())) {
        foldersList?.push(folder);
      }
    });
    return foldersList;
  };


  useEffect(() => {
    console.log("Folder structure after update: ", folderStructure);
  }, [folderStructure]);

  return {
    folderStructure,
    updateFolderStructure,
    getFolderWithId,
    getAllFilesWithName,
    getAllFoldersWithName,
  };
};

export default useFolderStructure;
