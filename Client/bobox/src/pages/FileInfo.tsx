import React, { useEffect, useState } from 'react';
import ShowFileInfo from '../components/ShowFileInfo';
import { DownloadInfoParams, SharedFile } from '../utils/types';
import { getFileInfo } from '../services/firebase';
import { CircularProgress, Button } from '@mui/material';
import axios from 'axios';
import { useParams } from 'react-router-dom';

const FileInfo: React.FC = () => {
  const [fileInfo, setFileInfo] = useState<SharedFile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Assuming you have a function to fetch file info based on the URL params
    const fetchFileInfo = async () => {
      const { ownerUid, fileId, downloadId } = useParams();
      if (!ownerUid || !fileId || !downloadId) {
        console.error('Invalid parameters');
        return;
      }

      const downloadInfoParams: DownloadInfoParams = {
        ownerUid: ownerUid,
        fileId: fileId,
        downloadId: downloadId,
      };

      try {
        // Fetch data and update state
        const result = await getFileInfo(downloadInfoParams);
        setFileInfo(result);
      } catch (error) {
        // Handle errors, e.g., display an error message
        console.error('Error fetching data:', error);
      } finally {
        // Set loading to false once the request is complete
        setLoading(false);
      }
    };

    fetchFileInfo();
  }, []);

  const downloadPart = async (partLink: string) => {
    try {
      const response = await axios.get(partLink, { responseType: 'arraybuffer' });
      return response.data;
    } catch (error) {
      console.error('Error downloading part:', error);
      throw error;
    }
  };

  const downloadAndAssembleFile = async () => {
    try {
      if (fileInfo && fileInfo.downloadLinks && fileInfo.downloadLinks.length > 0) {
        const maxRetries = 3;

        const assembleFile = async (retryCount: number) => {
          try {
            // Download all parts in parallel
            const partPromises = fileInfo.downloadLinks.map(async (partLink) => {
              try {
                return await downloadPart(partLink);
              } catch (downloadError) {
                // Retry if download fails, up to maxRetries times
                if (retryCount < maxRetries) {
                  console.warn(`Retrying download part after failure (${retryCount + 1} of ${maxRetries})`);
                  return await assembleFile(retryCount + 1);
                } else {
                  throw downloadError;
                }
              }
            });

            const parts = await Promise.all(partPromises);

            // Concatenate parts into a single ArrayBuffer
            const assembledFile = new Uint8Array(
              parts.reduce((acc, part) => [...acc, ...new Uint8Array(part)], [])
            );

            // Convert the ArrayBuffer to a Blob
            const assembledBlob = new Blob([assembledFile]);

            // Create a download link and trigger the download
            const downloadLink = document.createElement('a');
            downloadLink.href = URL.createObjectURL(assembledBlob);
            downloadLink.download = 'assembledFile.dat'; // Specify the filename
            downloadLink.click();
          } catch (error) {
            console.error('Error assembling file:', error);
          }
        };

        await assembleFile(0);
      }
    } catch (error) {
      console.error('Error downloading and assembling file:', error);
    }
  };

  const handleDownload = async () => {
    // Call the function to initiate the download and assembly process
    await downloadAndAssembleFile();
  };

  if (loading) {
    return <CircularProgress />;
  }

  if (!fileInfo) {
    // Handle the case where fileInfo is not available
    return <>Error</>;
  }

  return (
    <>
      <ShowFileInfo {...fileInfo} />
      <Button variant="contained" color="primary" onClick={handleDownload}>
        Download File
      </Button>
    </>
  );
};

export default FileInfo;
