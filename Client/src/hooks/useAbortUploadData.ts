import { useState, useEffect } from 'react';
import { AbortMultiPartUploadParams } from '../utils/types';
import { abortMultipartUpload } from '../services/firebase';

const STORAGE_KEY = 'abortUploadData';

const useAbortUploadData = (): [AbortMultiPartUploadParams, React.Dispatch<React.SetStateAction<AbortMultiPartUploadParams>>] => {
  const initialState: AbortMultiPartUploadParams = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null') || {
    uploadId: '',
    fileId: ''
  };
  useEffect(() => {
    if (initialState.uploadId && initialState.fileId) {
      // A page reload during an upload leaves an open multipart upload behind:
      // close it server-side so the quota and storage stay clean.
      abortMultipartUpload(initialState).then(() => {
        setAbortUploadData({
          uploadId: '',
          fileId: ''
        })
      });
    }
  }, []);

  const [abortUploadData, setAbortUploadData] = useState<AbortMultiPartUploadParams>(initialState);

  useEffect(() => {
    //console.log("Setting abort upload data in session storage to ", abortUploadData);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(abortUploadData));
  }, [abortUploadData]);

  return [abortUploadData, setAbortUploadData];
};

export default useAbortUploadData;
