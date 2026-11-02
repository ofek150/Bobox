import React from 'react';
import { SharedFile } from '../utils/types';
import { formatFileSize } from '../utils/helpers';

const ShowFileInfo: React.FC<SharedFile> = ({ fileName, fileSize, uploadedAt }) => {
  const formattedDate = new Date(uploadedAt).toLocaleDateString('en-GB');

  return (
    <div>
      <h2 className="mb-4 text-center text-2xl font-bold sm:text-3xl">File Info</h2>
      <dl className="flex flex-col gap-1 text-sm">
        <div className="flex flex-wrap gap-x-1.5">
          <dt className="font-bold">File Name:</dt>
          <dd className="min-w-0 break-words">{fileName}</dd>
        </div>
        <div className="flex flex-wrap gap-x-1.5">
          <dt className="font-bold">File Size:</dt>
          <dd>{formatFileSize(fileSize)}</dd>
        </div>
        {formattedDate != "Invalid Date" && (
          <div className="flex flex-wrap gap-x-1.5">
            <dt className="font-bold">Uploaded at:</dt>
            <dd>{formattedDate}</dd>
          </div>
        )}
      </dl>
    </div>
  );
};

export default ShowFileInfo;
