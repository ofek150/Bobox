import { useState, useEffect } from 'react';
import { AbortMultiPartUploadParameters } from '../utils/types';

const STORAGE_KEY = 'abortUploadData';

const useAbortUploadData = (): [AbortMultiPartUploadParameters, React.Dispatch<React.SetStateAction<AbortMultiPartUploadParameters>>] => {
  const initialState: AbortMultiPartUploadParameters = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null') || {
    uploadId: '',
    fileId: '',
    fileName: '',
    fileDirectory: '',
  };

  const [abortUploadData, setAbortUploadData] = useState<AbortMultiPartUploadParameters>(initialState);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(abortUploadData));
  }, [abortUploadData]);

  return [abortUploadData, setAbortUploadData];
};

export default useAbortUploadData;
