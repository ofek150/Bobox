import { useState, useEffect } from 'react';
import { AbortMultiPartUploadParameters } from '../utils/types';
import { abortMultipartUpload } from '../services/firebase';

const STORAGE_KEY = 'abortUploadData';

const useAbortUploadData = (): [AbortMultiPartUploadParameters, React.Dispatch<React.SetStateAction<AbortMultiPartUploadParameters>>] => {
  const initialState: AbortMultiPartUploadParameters = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null') || {
    uploadId: '',
    fileId: '',
    fileName: '',
    fileDirectory: '',
  };
  useEffect(() => {
    console.log("Initial state: ", initialState);
    if (initialState.uploadId && initialState.fileId && initialState.fileName) {
      abortMultipartUpload(initialState).then((result) => {
        console.log("Result of trying to abort: ", result);
        setAbortUploadData({
          uploadId: '',
          fileId: '',
          fileName: '',
          fileDirectory: ''
        })
      });
    }
  }, []);

  const [abortUploadData, setAbortUploadData] = useState<AbortMultiPartUploadParameters>(initialState);

  useEffect(() => {
    //console.log("Setting abort upload data in session storage to ", abortUploadData);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(abortUploadData));
  }, [abortUploadData]);

  return [abortUploadData, setAbortUploadData];
};

export default useAbortUploadData;
