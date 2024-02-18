import * as functions from "firebase-functions";
import { S3Client, PutObjectCommand, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand, GetObjectCommand, DeleteObjectCommand, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { AbortMultiPartUploadParams, CompleteMultiPartParams, GenerateDownloadLinkParams, LinkInfo, UploadFileParams, UploadPartParams } from "./utils/types";
import { addFileToDB, setFileUploaded, deleteFileFromDB, isUniqueFileName, getFileById, addLinkToDB, updatePrivateLinkDownloadId, getFolderById, getCollaboratorAccessLevel } from "./db";
import { FileEntry } from "./utils/types";
import { WEBSITE_URL, MAX_FILE_SIZE, SEVEN_DAYS_SECONDS, ACCESS_LEVEL } from "./utils/constants";
import { v4 as uuidv4 } from 'uuid';

export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

const addFileToDatabase = async (userId: string, data: any) => {
  //console.log("Data: ", data);
  const fileId: string = uuidv4();
  console.log("File id: ", fileId);
  const fileExtension = data.fileName.split('.').pop();
  const fileKey: string = fileExtension ? `${userId}/${fileId}.${fileExtension}` : `${userId}/${fileId}`;
  const fileToAdd: FileEntry = {
    fileId: fileId,
    parentFolderId: data.folderId,
    fileKey: fileKey,
    fileName: data.fileName,
    fileType: data.fileType,
    fileSize: data.fileSize
  }
  try {
    await addFileToDB(userId, fileToAdd);
  } catch (error: any) {
    if (error instanceof functions.https.HttpsError) throw error;
    throw new Error("Failed to upload file");
  }
  return { fileKey: fileKey, fileId: fileId };
}

export const initiateSmallFileUpload = functions.https.onCall(
  async (data: UploadFileParams, context) => {

    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');

    const { fileName, folderId, fileType, fileSize } = data || {};
    if (!folderId || !fileName || !fileSize || !fileType) throw new functions.https.HttpsError('invalid-argument', 'Missing arguments');

    if (fileSize > MAX_FILE_SIZE) throw new Error("The file is bigger than the max allowed file size" + MAX_FILE_SIZE.toString());
    if (folderId === "shared") throw new functions.https.HttpsError('permission-denied', 'You are not allowed to upload files here');

    try {

      const parentFolder = await getFolderById(context.auth.uid, folderId);
      if (!parentFolder) throw new functions.https.HttpsError('not-found', 'Parent folder not found');


      const accessLevel: ACCESS_LEVEL = getCollaboratorAccessLevel(parentFolder, context.auth.uid);
      if (parentFolder.ownerUid != context.auth.uid && accessLevel > ACCESS_LEVEL.ADMIN) throw new functions.https.HttpsError('permission-denied', 'You are not allowed to upload files to this folder');

      if (await isUniqueFileName(context.auth.uid, fileName, folderId)) throw new functions.https.HttpsError('already-exists', 'File with the same name already exist in the current folder!');

      const { fileKey, fileId } = await addFileToDatabase(context.auth.uid, data);

      const signedUrl = await getSignedUrl(
        r2,
        new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: fileKey,
          ContentType: data.fileType
        })
      );

      if (!signedUrl) throw new Error("Failed to generate upload url");

      return { uploadUrl: signedUrl, fileId: fileId };
    } catch (error: any) {
      if (error instanceof functions.https.HttpsError) throw error;
      else throw new functions.https.HttpsError('internal', 'Internal Server Error', { message: error.message });
    }
  }
);

export const completeSmallFileUpload = functions.https.onCall(
  async (fileId: string, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');

    if (!fileId) throw new functions.https.HttpsError('invalid-argument', 'Missing arguments');

    try {
      if (!await setFileUploaded(context.auth.uid, fileId, 1)) throw new functions.https.HttpsError('not-found', 'File not found');

      await addPrivateDownloadLink(context.auth.uid, fileId);

      return { success: true };
    } catch (error: any) {
      if (error instanceof functions.https.HttpsError) throw error;
      else throw new functions.https.HttpsError('internal', 'Internal Server Error', { message: error.message });
    }
  }
);

export const initiateMultipartUpload = functions.https.onCall(
  async (data: UploadFileParams, context) => {

    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');

    const { fileName, folderId, fileType, fileSize } = data || {};
    if (!folderId || !fileName || !fileSize || !fileType) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing arguments');
    }
    if (fileSize > MAX_FILE_SIZE) throw new Error("The file is bigger than the max allowed file size" + MAX_FILE_SIZE.toString());
    if (folderId === "shared") throw new functions.https.HttpsError('permission-denied', 'You are not allowed to upload files here');
    try {

      const parentFolder = await getFolderById(context.auth.uid, folderId);
      if (!parentFolder) throw new functions.https.HttpsError('not-found', 'Parent folder not found');

      const accessLevel: ACCESS_LEVEL = getCollaboratorAccessLevel(parentFolder, context.auth.uid);
      if (parentFolder.ownerUid != context.auth.uid && accessLevel > ACCESS_LEVEL.ADMIN) throw new functions.https.HttpsError('permission-denied', 'You are not allowed to upload files to this folder');

      if (await isUniqueFileName(context.auth.uid, fileName, folderId)) throw new functions.https.HttpsError('already-exists', 'File with the same name already exist in the current folder!');


      const { fileKey, fileId } = await addFileToDatabase(context.auth.uid, data);

      const createMultiPartUploadCommand = new CreateMultipartUploadCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileKey,
      });
      const result = await r2.send(createMultiPartUploadCommand);
      const uploadId: string | undefined = result.UploadId;
      if (!uploadId) throw new Error("uploadId is empty or undefined");

      return { uploadId: uploadId, fileId: fileId };
    } catch (error: any) {
      if (error instanceof functions.https.HttpsError) throw error;
      else throw new functions.https.HttpsError('internal', 'Internal Server Error', { message: error.message });
    }
  }
);

export const generateUploadPartURL = functions.https.onCall(
  async (data: UploadPartParams, context) => {
    // Ensure the user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "The function must be called while authenticated."
      );
    }
    const { fileId, partNumber, uploadId } = data || {};
    if (fileId || partNumber || uploadId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing arguments"
      );
    }
    try {
      const file = await getFileById(context.auth.uid, fileId);
      if (!file) throw new functions.https.HttpsError('not-found', 'File not found');

      const uploadPartCommand = new UploadPartCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: file.fileKey,
        UploadId: uploadId,
        PartNumber: partNumber,
      })

      const signedUrl = await getSignedUrl(r2, uploadPartCommand);

      if (!signedUrl) throw new Error("signedUrl is empty or undefined");

      console.log("Upload part url: ", signedUrl);

      return { uploadUrl: signedUrl };
    } catch (error: any) {
      if (error && error.code && error.code.startsWith("auth/")) {
        throw new functions.https.HttpsError("invalid-argument", error.message);
      }
      console.log("Failed generate upload part url: ", error.message);
      throw new functions.https.HttpsError(
        "internal",
        "Failed generate upload part url"
      );
    }
  }
);

export const completeMultipartUpload = functions.https.onCall(
  async (data: CompleteMultiPartParams, context) => {
    // Ensure the user is authenticated
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    const { uploadId, fileId, uploadResults } = data || {};
    if (!fileId || !uploadId || !uploadResults || !fileId) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing arguments');
    }
    try {
      const file = await getFileById(context.auth.uid, fileId);
      if (!file) throw new functions.https.HttpsError('not-found', 'File not found');

      const completeCommand = new CompleteMultipartUploadCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: file.fileKey,
        UploadId: uploadId,
        MultipartUpload: {
          Parts: uploadResults.map(({ ETag, partNumber }) => {
            console.log("Part number: ", partNumber, " ETag: ", ETag);
            return ({
              ETag,
              PartNumber: partNumber,
            })
          }),
        },
      })

      const result = await r2.send(completeCommand);

      if (result.$metadata.httpStatusCode === 200) {
        await setFileUploaded(context.auth.uid, data.fileId, data.uploadResults.length);
        await addPrivateDownloadLink(context.auth.uid, data.fileId);
        return { success: true };
      }
      throw new Error('Unexpected error occurred');

    } catch (error: any) {
      if (error instanceof functions.https.HttpsError) throw error;
      else throw new functions.https.HttpsError('internal', 'Internal Server Error', { message: error.message });
    }
  }
);

export const abortMultipartUpload = functions.https.onCall(
  async (data: AbortMultiPartUploadParams, context) => {
    // Ensure the user is authenticated
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');

    const { uploadId, fileId } = data || {};
    if (!fileId || !uploadId) throw new functions.https.HttpsError('invalid-argument', 'Missing arguments');
    try {
      const file = await getFileById(context.auth.uid, fileId);
      if (!file) throw new functions.https.HttpsError('not-found', 'File not found');

      const abortCommand = new AbortMultipartUploadCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: file.fileKey,
        UploadId: uploadId,
      });

      const result = await r2.send(abortCommand);
      if (result.$metadata.httpStatusCode === 204) {
        await deleteFileFromDB(context.auth.uid, fileId);
        return { success: true };
      }


      throw new Error("Unknown error occurred");


    } catch (error: any) {
      if (error instanceof functions.https.HttpsError) throw error;
      else throw new functions.https.HttpsError('internal', 'Internal Server Error', { message: error.message });
    }
  }
);

export const generatePublicDownloadLink = functions.https.onCall(
  async (data: GenerateDownloadLinkParams, context) => {
    // Ensure the user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'The function must be called while authenticated.'
      );
    }
    const { fileId, neverExpires, expiresAt } = data || {};
    if (!fileId) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing arguments');
    }

    try {
      const file = await getFileById(context.auth.uid, fileId);
      if (!file) throw new functions.https.HttpsError('not-found', 'File not found');

      let expiresIn: number | null = null;
      const currentDate = new Date();
      const expirationDate = new Date(currentDate);

      if (neverExpires) {
        // Set expiresIn to 7 days (max)
        expiresIn = SEVEN_DAYS_SECONDS;
        expirationDate.setDate(currentDate.getDate() + 7);
      } else if (data.expiresAt) {
        const now = new Date();
        expirationDate.setTime(new Date(data.expiresAt).getTime()); // Reassign without const
        expiresIn = Math.floor((expirationDate.getTime() - now.getTime()) / 1000);

        if (expiresIn > SEVEN_DAYS_SECONDS) {
          throw new Error('The expiration date has to be 7 days at max');
        }

        if (expiresIn < 0) {
          throw new Error('Expiration date is in the past');
        }
      } else {
        throw new Error('Invalid arguments');
      }

      const signedUrl = await generateDownloadLink(file.fileKey, expiresIn);

      const linkInfo: LinkInfo = {
        downloadLink: signedUrl,
        isPublic: true,
        isPermanent: neverExpires,
        expiresAt: expiresAt,
      };

      const downloadId = await addLinkToDB(context.auth.uid, fileId, linkInfo);
      const shareLink = `${WEBSITE_URL}/user/${context.auth.uid}/files/${fileId}?downloadId=${downloadId}`;

      return { link: shareLink };
    } catch (error: any) {
      console.error('Error:', error.message);
      if (error instanceof functions.https.HttpsError) throw error;
      else throw new functions.https.HttpsError('internal', 'Internal Server Error', { message: error.message });
    }
  }
);

export const addPrivateDownloadLink = async (userId: string, fileId: string) => {
  const file = await getFileById(userId, fileId);
  if (!file) throw new functions.https.HttpsError('not-found', 'File not found');

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
    Bucket: process.env.R2_BUCKET_NAME,
    Key: fileKey,
  });
  const signedUrl = await getSignedUrl(r2, getObjectCommand, { expiresIn: expiresIn, });
  if (!signedUrl) throw new Error('Failed to generate download link. Please try again later.');

  return signedUrl;
};

export const deleteFileFromCloudStorage = async (fileKey: string) => {
  const deleteCommand = new DeleteObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: fileKey
  })

  const result = await r2.send(deleteCommand);
  console.log("Result: ", result);

  if (result.$metadata.httpStatusCode === 204) return { success: true };

  throw new Error("Failed deleting file, please try again later!");
}

export const deleteFilesFromCloudStorage = async (fileKeys: string[]) => {
  const deleteCommand = new DeleteObjectsCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Delete: {
      Objects: fileKeys.map((key) => ({ Key: key })),
      Quiet: false,
    },
  });

  const result = await r2.send(deleteCommand);
  console.log("Result: ", result);

  if (result.$metadata.httpStatusCode === 200) return { success: true };

  throw new Error("Failed deleting files, please try again later!");
}

