import * as functions from "firebase-functions";
import { S3Client, PutObjectCommand, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { AbortMultiPartUploadParams, CompleteMultiPartParams, GenerateDownloadLinkParams, LinkInfo, UploadFileParams, UploadPartParams } from "./utils/types";
import { addFileToDB, setFileUploaded, deleteAbortedFileFromDB, doesFileExist, getFileInfo, addLinkToDB, updatePrivateLinkDownloadId } from "./db";
import { FileEntry } from "./utils/types";
import { WEBSITE_URL, MAX_FILE_SIZE, SEVEN_DAYS_SECONDS } from "./utils/constants";
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
    folderId: data.folderId,
    fileKey: fileKey,
    fileName: data.fileName,
    fileType: data.fileType,
    fileSize: data.fileSize
  }
  console.log("File to add: ", fileToAdd);
  try{
    await addFileToDB(userId, fileToAdd);
  } catch {
    throw new Error("Failed to upload file");
  }
  return { fileKey: fileKey, fileId: fileId };
}

export const initiateSmallFileUpload = functions.https.onCall(
  async (data: UploadFileParams, context) => {
    // Ensure the user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "The function must be called while authenticated."
      );
    }
    const { fileName, folderId, fileType, fileSize } = data || {};
    //console.log("Data: ", data);
    if (!folderId || !fileName || !fileSize || !fileType) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing arguments"
      );
    }

    console.log("File name: ", fileName, " Folder id: ", folderId, " fileSize: ", fileSize, " fileType: ", fileType);
    if (fileSize > MAX_FILE_SIZE) throw new Error("The file is bigger than the max allowed file size" + MAX_FILE_SIZE.toString());
    try {
      
      if (await doesFileExist(context.auth.uid, fileName, folderId)) throw new Error("File with the same name already exists");

      const { fileKey, fileId } = await addFileToDatabase(context.auth.uid, data);
      console.log("File key: ", fileKey, " File id: ", fileId);

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
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      else {
        throw new functions.https.HttpsError('internal', 'Internal Server Error', { message: error.message });
      }
    }
  }
);

export const completeSmallFileUpload = functions.https.onCall(
  async (fileId: string, context) => {
    // Ensure the user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "The function must be called while authenticated."
      );
    }

    if (!fileId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing arguments"
      );
    }
    try {
      await setFileUploaded(context.auth.uid, fileId, 1);

      await addPrivateDownloadLink(context.auth.uid, fileId);

      return { success: true };
    } catch (error: any) {
      if (error && error.code && error.code.startsWith("auth/")) {
        throw new functions.https.HttpsError("invalid-argument", error.message);
      }
      console.log("Failed to complete small file upload: ", error.message);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to complete small file upload"
      );
    }
  }
);

export const initiateMultipartUpload = functions.https.onCall(
  async (data: UploadFileParams, context) => {
    // Ensure the user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "The function must be called while authenticated."
      );
    }
    const { fileName, folderId, fileType, fileSize } = data || {};
    if (!folderId || !fileName || !fileSize || !fileType) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing arguments"
      );
    }
    if (fileSize > MAX_FILE_SIZE) throw new Error("The file is bigger than the max allowed file size" + MAX_FILE_SIZE.toString());
    try {
      if (await doesFileExist(context.auth.uid, fileName, folderId)) throw new Error("File with the same name already exists");

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
      if (error && error.code && error.code.startsWith("auth/")) {
        throw new functions.https.HttpsError("invalid-argument", error.message);
      } else if (error && error.message === "File with the same key already exists") {
        throw new functions.https.HttpsError(
          "internal",
          error.message
        );
      }
      else if (error && error.message === ("The file is bigger than the max allowed file size" + MAX_FILE_SIZE.toString())) {
        throw new functions.https.HttpsError(
          "internal",
          error.message
        );
      }
      console.log("Failed to initiate multipart upload: ", error.message);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to initiate multipart upload"
      );
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
      const fileInfo = await getFileInfo(context.auth.uid, fileId);
      

      const uploadPartCommand = new UploadPartCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileInfo.fileKey,
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
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "The function must be called while authenticated."
      );
    }
    const { uploadId, fileId, uploadResults } = data || {};
    if (!fileId || !uploadId || !uploadResults || !fileId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing arguments"
      );
    }
    try {
      const fileInfo = await getFileInfo(context.auth.uid, fileId);
      const completeCommand = new CompleteMultipartUploadCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileInfo.fileKey,
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
        setFileUploaded(context.auth.uid, data.fileId, data.uploadResults.length);
        await addPrivateDownloadLink(context.auth.uid, data.fileId);
        return { success: true };
      }
      throw new Error("request failed");

    } catch (error: any) {
      if (error && error.code && error.code.startsWith("auth/")) {
        throw new functions.https.HttpsError("invalid-argument", error.message);
      }
      console.log("Failed to complete multipart upload: ", error.message);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to complete multipart upload"
      );
    }
  }
);

export const abortMultipartUpload = functions.https.onCall(
  async (data: AbortMultiPartUploadParams, context) => {
    // Ensure the user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "The function must be called while authenticated."
      );
    }
    const { uploadId, fileId} = data || {};
    if (!fileId || !uploadId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing arguments"
      );
    }
    try {
      const fileInfo = await getFileInfo(context.auth.uid, fileId);


      const abortCommand = new AbortMultipartUploadCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileInfo.fileKey,
        UploadId: uploadId,
      });

      const result = await r2.send(abortCommand);
      if (result.$metadata.httpStatusCode === 204) {
        await deleteAbortedFileFromDB(context.auth.uid, fileId);
        return { success: true };
      }


      throw new Error("request failed");


    } catch (error: any) {
      if (error && error.code && error.code.startsWith("auth/")) {
        throw new functions.https.HttpsError("invalid-argument", error.message);
      }
      console.log("Failed to abort multipart upload: ", error.message);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to abort multipart upload"
      );
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
      const fileInfo = await getFileInfo(context.auth.uid, fileId);

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

      const signedUrl = await generatePrivateDownloadLink(fileInfo.fileKey, expiresIn);

      const linkInfo: LinkInfo = {
        downloadLink: signedUrl,
        isPublic: true,
        neverExpires: false,
        expiresAt: expiresAt,
      };

      const downloadId = await addLinkToDB(context.auth.uid, fileId, linkInfo);
      const shareLink = `${WEBSITE_URL}/${context.auth.uid}/${fileId}/${downloadId}/view`;

      return { link: shareLink };
    } catch (error: any) {
      console.error('Error:', error.message);
      throw new functions.https.HttpsError('internal', 'Internal Server Error', { message: error.message });
    }
  }
);

export const addPrivateDownloadLink = async (userId: string, fileId: string) => {
  const fileInfo = await getFileInfo(userId, fileId);

  const currentDate = new Date();
  const expirationDate = new Date(currentDate);
  expirationDate.setDate(currentDate.getDate() + 7);

  const signedUrl = await generatePrivateDownloadLink(fileInfo.fileKey, SEVEN_DAYS_SECONDS);

  const linkInfo: LinkInfo = {
    downloadLink: signedUrl,
    isPublic: false,
    neverExpires: false,
    expiresAt: expirationDate,
  };


  const downloadId = await addLinkToDB(userId, fileId, linkInfo);
  await updatePrivateLinkDownloadId(userId, fileId, downloadId);
};

export const generatePrivateDownloadLink = async (fileKey: string, expiresIn: number) => {
  const getObjectCommand = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: fileKey,
  });
  const signedUrl = await getSignedUrl(r2, getObjectCommand, { expiresIn: expiresIn });
  if (!signedUrl) throw new Error('Failed to generate download link. Please try again later.');

  return signedUrl;
};
