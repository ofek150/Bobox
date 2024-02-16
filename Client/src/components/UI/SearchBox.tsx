import React, { useState } from "react";
import { useFolderStructureContext } from "../../contexts/FolderStructureContext";
import TextField from "@mui/material/TextField";
import FolderIcon from "@mui/icons-material/Folder";
import { File, Folder } from "../../utils/types";
import DescriptionIcon from "@mui/icons-material/Description";
import { Box, List, ListItem, ListItemText, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { formatFileSize } from "../../utils/helpers";
import { auth } from "../../services/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { enqueueSnackbar } from "notistack";
import NotFoundPage from "../../pages/NotFoundPage";

interface SearchBoxProps {
  placeholder?: string;
}

const SearchBox: React.FC<SearchBoxProps> = ({
  placeholder = "Search your files",
}) => {
  const [user] = useAuthState(auth);
  const [searchTerm, setSearchTerm] = useState("");
  const { getAllFilesWithName, getAllFoldersWithName } =
    useFolderStructureContext();

  // Keep track of results (optional, you can modify based on UI choices)
  const [filesResults, setFileResults] = useState<File[]>([]);
  const [folderResults, setFolderResults] = useState<Folder[]>([]);
  const navigate = useNavigate();

  const clearResults = () => {
    setSearchTerm("");
    setFileResults([]);
    setFolderResults([]);
  };
  const handleSearchChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newSearchTerm = event.target.value;
    setSearchTerm(newSearchTerm);

    if (newSearchTerm.length > 0) {
      const newFileResults = await getAllFilesWithName(newSearchTerm);
      const newFolderResults = await getAllFoldersWithName(newSearchTerm);
      setFileResults(newFileResults);
      setFolderResults(newFolderResults);
      console.log(newFileResults);
    } else {
      setFileResults([]);
      setFolderResults([]);
    }
  };
  const navigateToFileInfo = async (file: File) => {
    const link = `/user/${file.ownerUid}/files/${file.fileId}?downloadId=${file.privateLinkDownloadId}`;
    navigate(link);
  };
  return (
    <Box sx={{ width: '50%' }}>
      <TextField
        value={searchTerm}
        onChange={handleSearchChange}
        placeholder={placeholder}
        variant="outlined"
        fullWidth
      />
      <div>
        {folderResults.length === 0 && searchTerm.length > 0 && (
          <div>
            <Typography variant="subtitle1" sx={{ mt: 2, ml: 2, fontWeight: 500 }} >No results</Typography>
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
                  <FolderIcon style={{ marginRight: "8px" }} />
                  <ListItemText
                    primary={folder.folderName}
                    secondary={folder.folderId === "root" || folder.folderId === "shared" ? '' : `Created at: ${folder.createdAt}`}
                    sx={{ mr: 10 }}
                  />
                  {folder.shared &&
                    <ListItemText
                      secondary="Shared"
                      sx={{ ml: 5 }}
                    />}
                </ListItem>
              ))}
            </>
          )}
          {filesResults.length > 0 && (
            <>
              {filesResults.map((file) => (
                <ListItem
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
