import React, { useEffect, useState } from "react";
import { FileText, Folder, FolderUsers } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDebounce } from 'usehooks-ts';

import { useFolderStructureContext } from "../../contexts/FolderStructureContext";
import { formatFileSize } from "../../utils/helpers";
import { File, Folder as FolderType } from "../../utils/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SearchBoxProps {
  placeholder?: string;
}

const SearchBox: React.FC<SearchBoxProps> = ({
  placeholder = "Search your files",
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce<string>(searchTerm, 500);
  const [filesResults, setFileResults] = useState<File[]>([]);
  const [folderResults, setFolderResults] = useState<FolderType[]>([]);

  const { getAllFilesWithName, getAllFoldersWithName } = useFolderStructureContext();
  const navigate = useNavigate();

  const clearResults = () => {
    setSearchTerm("");
    setFileResults([]);
    setFolderResults([]);
  };

  useEffect(() => {
    const getResults = async () => {
      if (debouncedSearchTerm.length > 0) {
        const newFileResults = await getAllFilesWithName(debouncedSearchTerm);
        const newFolderResults = await getAllFoldersWithName(debouncedSearchTerm);
        setFileResults(newFileResults);
        setFolderResults(newFolderResults);
      } else {
        setFileResults([]);
        setFolderResults([]);
      }
    };

    getResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchTerm]);

  const navigateToFileInfo = async (file: File) => {
    const link = `/user/${file.ownerUid}/files/${file.fileId}?downloadId=${file.privateLinkDownloadId}`;
    navigate(link);
  };

  const hasResults = folderResults.length > 0 || filesResults.length > 0;

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Input
        type="search"
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-12 rounded-xl text-base"
      />

      {searchTerm.length > 0 && (
        <div className="mt-3 flex flex-col gap-1">
          {!hasResults && (
            <p className="px-2 py-1 font-medium text-muted-foreground">No results</p>
          )}

          {folderResults.map((folder) => (
            <Button
              key={folder.folderId}
              variant="ghost"
              className="h-auto justify-start gap-3 rounded-lg py-2.5 text-left"
              onClick={() => {
                navigate(`/user/folders/${folder.folderId}`);
                clearResults();
              }}
            >
              {folder.shared ? <FolderUsers className="shrink-0" /> : <Folder className="shrink-0" />}
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{folder.folderName}</span>
                {folder.folderId !== "root" && folder.folderId !== "shared" && (
                  <span className="block truncate text-xs font-normal text-muted-foreground">
                    Created at: {folder.createdAt}
                  </span>
                )}
              </span>
              {folder.shared && <span className="shrink-0 text-xs text-muted-foreground">Shared</span>}
            </Button>
          ))}

          {filesResults.map((file) => (
            <Button
              key={file.fileId}
              variant="ghost"
              className="h-auto justify-start gap-3 rounded-lg py-2.5 text-left"
              onClick={() => navigateToFileInfo(file)}
            >
              <FileText className="shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{file.fileName}</span>
                <span className="block truncate text-xs font-normal text-muted-foreground">
                  Size: {formatFileSize(file.fileSize)} | Uploaded At: {file.uploadedAt}
                </span>
              </span>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchBox;
