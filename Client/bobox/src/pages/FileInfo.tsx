import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ShowFileInfo from '../components/ShowFileInfo';
import { DownloadInfoParams, SharedFile } from '../utils/types';
import { getFileInfo } from '../services/firebase';
import { CircularProgress } from '@mui/material';

const FileInfo: React.FC = () => {
  const { ownerUid, fileId, downloadId } = useParams();
  const [fileInfo, setFileInfo] = useState<SharedFile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
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

    fetchData();
  }, [ownerUid, fileId, downloadId]);

  if (loading) {
    return <CircularProgress />;
  }

  if (!fileInfo) {
    // Handle the case where fileInfo is not available
    return <>Error</>;
  }

  const handleDownload = async () => {
    
  }
  return (
    <>
      <ShowFileInfo {...fileInfo} />
      
      <button onClick={handleDownload}>Download file</button>
    </>
  );
};

export default FileInfo;
