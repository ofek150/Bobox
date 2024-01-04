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
    console.log("Initial state: ", initialState);
    if (initialState.uploadId && initialState.fileId) {
      abortMultipartUpload(initialState).then((result) => {
        console.log("Result of trying to abort: ", result);
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
