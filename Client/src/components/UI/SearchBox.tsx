import React, { useState } from "react";
import { useFolderStructureContext } from "../../contexts/FolderStructureContext";
import TextField from "@mui/material/TextField";
import /* Other UI components as needed */ "@mui/material";
import FolderIcon from "@mui/icons-material/Folder";
import { File, Folder } from "../../utils/types";
import DescriptionIcon from "@mui/icons-material/Description";
import { List, ListItem, ListItemText } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { formatFileSize } from "../../utils/helpers";
import { auth, getPrivateDownloadId } from "../../services/firebase";
import { useAuthState } from "react-firebase-hooks/auth";

interface SearchBoxProps {
  // (Optional) Placeholder text for the search box
  placeholder?: string;
}

const SearchBox: React.FC<SearchBoxProps> = ({
  placeholder = "Search your files",
}) => {
  const [user, loadingAuthState] = useAuthState(auth);
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
  const navigateToFileInfo = async (fileId: string) => {
    const { downloadId, error } = await getPrivateDownloadId(fileId);
    console.log(downloadId);
    if (error) {
      console.error("Couldn't fetch file information");
      return;
    }
    const link = `/${user?.uid}/${fileId}/${downloadId}/view`;
    navigate(link);
  };
  return (
    <div>
      {" "}
      {/* Styling wrapper if needed */}
      <TextField
        value={searchTerm}
        onChange={handleSearchChange}
        placeholder={placeholder}
        variant="outlined"
        fullWidth
      // Styling or other attributes  as needed
      />
      {/* Display results area - structure this based on desired UI */}
      {/* Example: */}
      <div>
        {/* If folders exist, you could display them */}

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
                    navigateToFileInfo(file.fileId);
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
        {/* Display file results, similar structure */}
      </div>
    </div>
  );
};

export default SearchBox;
