import React, { useEffect, useState } from "react";
import { useFolderStructureContext } from "../../contexts/FolderStructureContext";
import TextField from "@mui/material/TextField";
import FolderIcon from "@mui/icons-material/Folder";
import FolderSharedIcon from '@mui/icons-material/FolderShared';
import DescriptionIcon from "@mui/icons-material/Description";
import { Box, List, ListItem, ListItemText, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { formatFileSize } from "../../utils/helpers";
import { File, Folder } from "../../utils/types";
import { useDebounce } from 'usehooks-ts';

interface SearchBoxProps {
  placeholder?: string;
}

const SearchBox: React.FC<SearchBoxProps> = ({
  placeholder = "Search your files",
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce<string>(searchTerm, 500);
  const [filesResults, setFileResults] = useState<File[]>([]);
  const [folderResults, setFolderResults] = useState<Folder[]>([]);

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
  }, [debouncedSearchTerm]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const navigateToFileInfo = async (file: File) => {
    const link = `/user/${file.ownerUid}/files/${file.fileId}?downloadId=${file.privateLinkDownloadId}`;
    navigate(link);
  };

  return (
    <Box sx={{ width: "100%", maxWidth: "600px", margin: "auto" }}>
      <TextField
        value={searchTerm}
        onChange={handleSearchChange}
        placeholder={placeholder}
        variant="outlined"
        fullWidth
        InputProps={{
          sx: {
            borderRadius: 3,
            backgroundColor: "rgba(0, 0, 0, 0.02)",
          },
        }}
      />

      <div>
        {folderResults.length === 0 && filesResults.length === 0 && searchTerm.length > 0 && (
          <div>
            <Typography variant="subtitle1" sx={{ mt: 2, ml: 2, fontWeight: 500 }}>
              No results
            </Typography>
          </div>
        )}
        <List>
          {folderResults.length > 0 && (
            <>
              {folderResults.map((folder) => (
                <ListItem
                  key={folder.folderId}
                  button
                  onClick={() => {
                    navigate(`/user/folders/${folder.folderId}`);
                    clearResults();
                  }}
                >
                  {folder.shared ? <FolderSharedIcon style={{ marginRight: "8px" }} /> : <FolderIcon style={{ marginRight: "8px" }} />}
                  <ListItemText
                    primary={folder.folderName}
                    secondary={folder.folderId === "root" || folder.folderId === "shared" ? "" : `Created at: ${folder.createdAt}`}
                    sx={{ mr: 10 }}
                  />
                  {folder.shared && (
                    <ListItemText secondary="Shared" sx={{ ml: 5 }} />
                  )}
                </ListItem>
              ))}
            </>
          )}
          {filesResults.length > 0 && (
            <>
              {filesResults.map((file) => (
                <ListItem
                  key={file.fileId}
                  button
                  onClick={() => {
                    navigateToFileInfo(file);
                  }}
                >
                  <DescriptionIcon style={{ marginRight: "8px" }} />
                  <ListItemText
                    primary={file.fileName}
                    secondary={`Size: ${formatFileSize(
                      file.fileSize
                    )} | Uploaded At: ${file.uploadedAt}`}
                    sx={{ mr: 10 }}
                  />
                </ListItem>
              ))}
            </>
          )}
        </List>
      </div>
    </Box>
  );
};

export default SearchBox;