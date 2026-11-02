import React, { useEffect, useState } from 'react';
import { Download, Eye, Loader2 } from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import streamSaver from 'streamsaver';
import { toast } from 'sonner';

import ShowFileInfo from '../components/ShowFileInfo';
import FileNotFound from '../components/FileNotFound';
import { DownloadInfoParams, SharedFile } from '../utils/types';
import { getFileInfo } from '../services/firebase';
import Loading from '../components/Loading';
import PreviewDialog from '../components/common/PreviewDialog';
import { previewKind } from '../components/common/previewKind';
import { FileIcon } from '../components/common/FileTypeIcon';
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

      // getFileInfo never throws: callables return { error } on failure.
      const { fileInfo, error } = await getFileInfo(downloadInfoParams);
      if (error) {
        setError(error);
      } else {
        setFileInfo(fileInfo);
      }
      setLoading(false);
    };

    fetchFileInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerUid, fileId, downloadId]);

  const handleError = (error: string | null = null) => {
    setError(error || "An error occurred while fetching file information");
    toast.error(error, { id: error ?? 'file-info-error' });
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
            handleError("The download failed partway. Please try again.");
          });

      } catch (error) {
        handleError("The download failed. Please try again.");
      } finally {
        setDownloading(false);
      }
    }
  };

  if (loading) {
    return <Loading />;
  }

  if (error && !fileInfo) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16">
        <FileNotFound />
        <p className="-mt-2 max-w-sm text-center text-sm text-destructive">{error}</p>
        <Button variant="secondary" asChild>
          <a href="/user/folders/root">Go to My Storage</a>
        </Button>
      </div>
    );
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
