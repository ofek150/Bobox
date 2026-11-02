import { CallableRequest, HttpsError, onCall } from "firebase-functions/v2/https";
import { S3Client, PutObjectCommand, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand, GetObjectCommand, DeleteObjectCommand, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { AbortMultiPartUploadParams, CompleteMultiPartParams, GenerateDownloadLinkParams, LinkInfo, UploadFileParams, UploadPartParams } from "./utils/types.js";
import { addFileToDB, setFileUploaded, deleteFileFromDB, isUniqueFileName, getFileById, addLinkToDB, updatePrivateLinkDownloadId, getFolderById } from "./db.js";
import { FileEntry } from "./utils/types";import { WEBSITE_URL, SEVEN_DAYS_SECONDS, ACCESS_LEVEL } from "./utils/constants.js";
import { internal, requireAccess, requireAuth, requireFields, requireFileSize, requireName, safeExtension } from "./utils/guards.js";
import { v4 as uuidv4 } from 'uuid';
import 'dotenv/config'

const bucket = () => process.env.R2_BUCKET_NAME as string;

let s3Client: S3Client | null = null;
/** Lazily built so env vars resolve at call time (and tests can run without them). */
export const r2 = (): S3Client => {
  if (!s3Client) {
    if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
      throw new HttpsError('internal', 'Storage is not configured. Please try again later.');
    }
    s3Client = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return s3Client;
};

const addFileToDatabase = async (userId: string, fileName: string, folderId: string, fileType: string, fileSize: number) => {
  const fileId: string = uuidv4();
  const ext = safeExtension(fileName);
  const fileKey: string = ext ? `${userId}/${fileId}.${ext}` : `${userId}/${fileId}`;
  const fileToAdd: FileEntry = {
    fileId: fileId,
    parentFolderId: folderId,
    fileKey: fileKey,
    fileName: fileName,
    fileType: fileType,
    fileSize: fileSize
  }
  await addFileToDB(userId, fileToAdd);
  return { fileKey: fileKey, fileId: fileId };
}

/** Shared validation for both upload initiations: returns the vetted params. */
const validateUpload = async (uid: string, data: Record<string, any>) => {
  const { folderId, fileName, fileType } = data;
  const fileSize = requireFileSize(data.fileSize);
  const name = requireName(fileName, 'file');
  if (folderId === "shared") throw new HttpsError('permission-denied', 'You are not allowed to upload files here');
  if (typeof fileType !== 'string' || !/^[\w.+/-]{1,127}$/.test(fileType)) {
    throw new HttpsError('invalid-argument', 'The file type is invalid.');
  }

  const parentFolder = await getFolderById(uid, folderId);
  requireAccess(parentFolder ?? null, uid, ACCESS_LEVEL.ADMIN, 'Parent folder not found');

  if (await isUniqueFileName(uid, name, folderId)) throw new HttpsError('already-exists', 'A file with the same name already exists in this folder.');
  return { folderId: folderId as string, fileName: name, fileType, fileSize };
};

export const initiateSmallFileUpload = onCall({ cors: true },

  async (request: CallableRequest<UploadFileParams>) => {
    const uid = requireAuth(request.auth);
    const data = requireFields(request.data, ['fileName', 'folderId', 'fileType', 'fileSize']);

    try {
      const params = await validateUpload(uid, data);
      const { fileKey, fileId } = await addFileToDatabase(uid, params.fileName, params.folderId, params.fileType, params.fileSize);

      const signedUrl = await getSignedUrl(
        r2(),
        new PutObjectCommand({
          Bucket: bucket(),
          Key: fileKey,
          ContentType: params.fileType
        })
      );

      if (!signedUrl) throw new Error("Failed to generate upload url");

      return { uploadUrl: signedUrl, fileId: fileId };
    } catch (error: unknown) {
      throw internal('initiateSmallFileUpload', error);
    }
  }
);

export const completeSmallFileUpload = onCall({ cors: true },

  async (request: CallableRequest<string>) => {
    const uid = requireAuth(request.auth);
    if (!request.data) throw new HttpsError('invalid-argument', 'Missing arguments');

    try {
      if (!await setFileUploaded(uid, request.data, 1)) throw new HttpsError('not-found', 'File not found');

      await addPrivateDownloadLink(uid, request.data);

      return { success: true };
    } catch (error: unknown) {
      throw internal('completeSmallFileUpload', error);
    }
  }
);

export const initiateMultipartUpload = onCall({ cors: true },

  async (request: CallableRequest<UploadFileParams>) => {
    const uid = requireAuth(request.auth);
    const data = requireFields(request.data, ['fileName', 'folderId', 'fileType', 'fileSize']);

    try {
      const params = await validateUpload(uid, data);
      const { fileKey, fileId } = await addFileToDatabase(uid, params.fileName, params.folderId, params.fileType, params.fileSize);

      const createMultiPartUploadCommand = new CreateMultipartUploadCommand({
        Bucket: bucket(),
        Key: fileKey,
        ContentType: params.fileType,
      });
      const result = await r2().send(createMultiPartUploadCommand);
      const uploadId: string | undefined = result.UploadId;
      if (!uploadId) throw new Error("uploadId is empty or undefined");

      return { uploadId: uploadId, fileId: fileId };
    } catch (error: unknown) {
      throw internal('initiateMultipartUpload', error);
    }
  }
);

export const generateUploadPartURL = onCall({ cors: true },

  async (request: CallableRequest<UploadPartParams>) => {
    const uid = requireAuth(request.auth);
    const { fileId, partNumber, uploadId } = requireFields(request.data, ['fileId', 'partNumber', 'uploadId']);
    if (typeof partNumber !== 'number' || !Number.isInteger(partNumber) || partNumber < 1) {
      throw new HttpsError('invalid-argument', 'The part number is invalid.');
    }
    try {
      const file = await getFileById(uid, fileId);
      if (!file) throw new HttpsError('not-found', 'File not found');

      const uploadPartCommand = new UploadPartCommand({
        Bucket: bucket(),
        Key: file.fileKey,
        UploadId: uploadId,
        PartNumber: partNumber,
      })

      const signedUrl = await getSignedUrl(r2(), uploadPartCommand);

      if (!signedUrl) throw new Error("signedUrl is empty or undefined");

      return { uploadUrl: signedUrl };
    } catch (error: unknown) {
      throw internal('generateUploadPartURL', error);
    }
  }
);

export const completeMultipartUpload = onCall({ cors: true },

  async (request: CallableRequest<CompleteMultiPartParams>) => {
    const uid = requireAuth(request.auth);
    const { uploadId, fileId, uploadResults } = requireFields(request.data, ['fileId', 'uploadId', 'uploadResults']);
    if (!Array.isArray(uploadResults) || uploadResults.length === 0 ||
      uploadResults.some((p) => !p || typeof p.ETag !== 'string' || !Number.isInteger(p.partNumber) || p.partNumber < 1)) {
      throw new HttpsError('invalid-argument', 'The upload results are invalid.');
    }
    try {
      const file = await getFileById(uid, fileId);
      if (!file) throw new HttpsError('not-found', 'File not found');

      const completeCommand = new CompleteMultipartUploadCommand({
        Bucket: bucket(),
        Key: file.fileKey,
        UploadId: uploadId,
        MultipartUpload: {
          Parts: uploadResults.map(({ ETag, partNumber }) => ({
            ETag,
            PartNumber: partNumber,
          })),
        },
      });

      const result = await r2().send(completeCommand);
      if ((result.$metadata.httpStatusCode ?? 500) >= 300) {
        throw new Error('R2 rejected the multipart completion');
      }

      await setFileUploaded(uid, fileId, uploadResults.length);
      await addPrivateDownloadLink(uid, fileId);
      return { success: true };

    } catch (error: unknown) {
      throw internal('completeMultipartUpload', error);
    }
  }
);

export const abortMultipartUpload = onCall({ cors: true },

  async (request: CallableRequest<AbortMultiPartUploadParams>) => {
    const uid = requireAuth(request.auth);
    const { uploadId, fileId } = requireFields(request.data, ['fileId', 'uploadId']);
    try {
      const file = await getFileById(uid, fileId);
      if (!file) throw new HttpsError('not-found', 'File not found');

      const abortCommand = new AbortMultipartUploadCommand({
        Bucket: bucket(),
        Key: file.fileKey,
        UploadId: uploadId,
      });

      await r2().send(abortCommand);
      // The upload is gone; drop the In-Progress DB entry (quota is
      // decremented only for files that were actually uploaded).
      await deleteFileFromDB(uid, fileId);
      return { success: true };

    } catch (error: unknown) {
      throw internal('abortMultipartUpload', error);
    }
  }
);

export const generatePublicDownloadLink = onCall({ cors: true },

  async (request: CallableRequest<GenerateDownloadLinkParams>) => {
    const uid = requireAuth(request.auth);
    const { fileId, neverExpires, expiresAt } = requireFields(request.data, ['fileId']);

    try {
      const file = await getFileById(uid, fileId);
      if (!file) throw new HttpsError('not-found', 'File not found');

      let expiresIn: number;
      const currentDate = new Date();
      const expirationDate = new Date(currentDate);

      if (neverExpires) {
        // "Never expires" links are capped at 7 days; the expiry is computed
        // server-side, never taken from the client.
        expiresIn = SEVEN_DAYS_SECONDS;
        expirationDate.setDate(currentDate.getDate() + 7);
      } else if (expiresAt) {
        const parsed = new Date(expiresAt);
        if (Number.isNaN(parsed.getTime())) {
          throw new HttpsError('invalid-argument', 'The expiration date is invalid.');
        }
        expirationDate.setTime(parsed.getTime());
        expiresIn = Math.floor((parsed.getTime() - currentDate.getTime()) / 1000);

        if (expiresIn > SEVEN_DAYS_SECONDS) {
          throw new HttpsError('invalid-argument', 'The expiration date has to be 7 days at max');
        }
        if (expiresIn < 0) {
          throw new HttpsError('invalid-argument', 'Expiration date is in the past');
        }
      } else {
        throw new HttpsError('invalid-argument', 'Invalid arguments');
      }

      const signedUrl = await generateDownloadLink(file.fileKey, expiresIn);

      const linkInfo: LinkInfo = {
        downloadLink: signedUrl,
        isPublic: true,
        isPermanent: false,
        expiresAt: expirationDate,
      };

      const downloadId = await addLinkToDB(uid, fileId, linkInfo);
      const shareLink = `${WEBSITE_URL}/user/${uid}/files/${fileId}?downloadId=${downloadId}`;

      return { link: shareLink };
    } catch (error: unknown) {
      throw internal('generatePublicDownloadLink', error);
    }
  }
);

export const addPrivateDownloadLink = async (userId: string, fileId: string) => {
  const file = await getFileById(userId, fileId);
  if (!file) throw new HttpsError('not-found', 'File not found');

  const currentDate = new Date();
  const expirationDate = new Date(currentDate);
  expirationDate.setDate(currentDate.getDate() + 7);

  const signedUrl = await generateDownloadLink(file.fileKey, SEVEN_DAYS_SECONDS);

  const linkInfo: LinkInfo = {
    downloadLink: signedUrl,
    isPublic: false,
    isPermanent: true,
    expiresAt: expirationDate,
  };

  const downloadId = await addLinkToDB(userId, fileId, linkInfo);
  await updatePrivateLinkDownloadId(userId, fileId, downloadId);

  return downloadId;
};

export const generateDownloadLink = async (fileKey: string, expiresIn: number) => {
  const getObjectCommand = new GetObjectCommand({
    Bucket: bucket(),
    Key: fileKey,
  });
  const signedUrl = await getSignedUrl(r2(), getObjectCommand, { expiresIn: expiresIn, });
  if (!signedUrl) throw new Error('Failed to generate download link. Please try again later.');

  return signedUrl;
};

export const deleteFileFromCloudStorage = async (fileKey: string) => {
  const deleteCommand = new DeleteObjectCommand({
    Bucket: bucket(),
    Key: fileKey
  })

  const result = await r2().send(deleteCommand);

  if ((result.$metadata.httpStatusCode ?? 500) < 300) return { success: true };

  throw new Error("Failed deleting file, please try again later!");
}

const DELETE_CHUNK = 1000; // S3 DeleteObjects hard limit

export const deleteFilesFromCloudStorage = async (fileKeys: string[]) => {
  for (let i = 0; i < fileKeys.length; i += DELETE_CHUNK) {
    const chunk = fileKeys.slice(i, i + DELETE_CHUNK);
    const deleteCommand = new DeleteObjectsCommand({
      Bucket: bucket(),
      Delete: {
        Objects: chunk.map((key) => ({ Key: key })),
        Quiet: true,
      },
    });

    const result = await r2().send(deleteCommand);
    if ((result.$metadata.httpStatusCode ?? 500) >= 300) {
      throw new Error("Failed deleting files, please try again later!");
    }
  }
  return { success: true };
}
