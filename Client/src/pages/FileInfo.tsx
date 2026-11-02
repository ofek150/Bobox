import React, { useEffect, useState } from 'react';
import { Download, Eye, Loader2 } from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import streamSaver from 'streamsaver';
import { toast } from 'sonner';

import ShowFileInfo from '../components/ShowFileInfo';
import { DownloadInfoParams, SharedFile } from '../utils/types';
import { getFileInfo } from '../services/firebase';
import Loading from '../components/Loading';
import PreviewDialog, { previewKind } from '../components/UI/PreviewDialog';
import { FileIcon } from '../components/UI/FileTypeIcon';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const FileInfo: React.FC = () => {
  const { ownerUid, fileId } = useParams();
  const [searchParams] = useSearchParams();
  const downloadId = searchParams.get("downloadId") === "undefined" ? null : searchParams.get("downloadId");
  const navigate = useNavigate();
  const [fileInfo, setFileInfo] = useState<SharedFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [openPreview, setOpenPreview] = useState(false);

  useEffect(() => {
    const fetchFileInfo = async () => {
      if (!ownerUid || !fileId || !downloadId) {
        navigate("/user/folders/root");
        return;
      }

      const downloadInfoParams: DownloadInfoParams = {
        ownerUid: ownerUid!,
        fileId: fileId!,
        downloadId: downloadId!,
      };

      try {
        const { fileInfo } = await getFileInfo(downloadInfoParams);
        setFileInfo(fileInfo);
      } catch (error: any) {
        handleError("File information not available. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchFileInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerUid, fileId, downloadId]);

  const handleError = (error: string | null = null) => {
    setError(error || "An error occurred while fetching file information");
    toast.error(error);

    navigate("/user/folders/root");
  };

  const handleDownload = async () => {
    if (fileInfo && fileInfo.downloadLink) {
      setDownloading(true);
      try {
        const res = await fetch(fileInfo.downloadLink);
        if (!res || !res.body) throw new Error("download failed");

        const fileStream = streamSaver.createWriteStream(fileInfo.fileName);
        const writer = fileStream.getWriter();

        const reader = res.body.getReader();

        const pump: any = () => reader.read()
          .then(({ value, done }) => {
            if (done) writer.close();
            else {
              writer.write(value);
              return writer.ready.then(pump);
            }
          });

        await pump()
          .catch(() => {
            handleError("An error occurred during the download.");
          });

      } catch (error) {
        handleError("An error occurred during the download.");
      } finally {
        setDownloading(false);
      }
    }
  };

  if (loading) {
    return <Loading />;
  }

  const kind = fileInfo ? previewKind(fileInfo) : null;

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10">
      {fileInfo && (
        <Card className="w-full max-w-sm">
          <CardContent className="flex flex-col items-center gap-5 pt-8">
            <span className="flex size-16 items-center justify-center rounded-2xl bg-secondary">
              <FileIcon fileName={fileInfo.fileName} className="size-8" />
            </span>
            <ShowFileInfo {...fileInfo} />
            <div className="flex w-full flex-col gap-2">
              {!error && (
                <Button onClick={handleDownload} disabled={downloading} className="w-full">
                  {downloading ? <Loader2 className="animate-spin" /> : <Download />}
                  Download
                </Button>
              )}
              {kind && (
                <Button variant="secondary" onClick={() => setOpenPreview(true)} className="w-full">
                  <Eye />
                  Preview
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <PreviewDialog
        open={openPreview}
        onOpenChange={setOpenPreview}
        fileInfo={fileInfo}
        onDownload={handleDownload}
      />
    </div>
  );
};

export default FileInfo;
