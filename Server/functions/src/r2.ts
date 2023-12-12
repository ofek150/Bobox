import * as functions from "firebase-functions";
import { S3Client, PutObjectCommand, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { AbortMultiPartUploadParams, CompleteMultiPartParams, GenerateDownloadLinkParams, LinkInfo, UploadFileParams, UploadPartParams } from "./utils/types";
import { addFileToDB, setFileUploaded, deleteAbortedFileFromDB, doesFileExist, getFileInfo, addLinkToDB } from "./db";
import { FileEntry } from "./utils/types";
import { MAX_FILE_SIZE, WEBSITE_URL } from "./utils/constants";

export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

export const initiateSmallFileUpload = functions.https.onCall(
  async (data: UploadFileParams, context) => {
    // Ensure the user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "The function must be called while authenticated."
      );
    }

    if (!data || !data.fileName || !data.fileSize || !data.fileType) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing arguments"
      );
    }
    if (data.fileSize > MAX_FILE_SIZE) throw new Error("The file is bigger than the max allowed file size" + MAX_FILE_SIZE.toString());
    try {
      const fileKey: string = `${context.auth.uid}/${data.fileDirectory}${data.fileName}`
      if (await doesFileExist(context.auth.uid, fileKey)) throw new Error("File with the same name already exists");

      const fileToAdd: FileEntry = {
        fileKey: fileKey,
        fileName: data.fileName,
        fileType: data.fileType,
        fileSize: data.fileSize
      }
      const fileId: string = await addFileToDB(context.auth.uid, fileToAdd);

      const signedUrl = await getSignedUrl(
        r2,
        new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: fileKey,
          ContentType: data.fileType
        })
      );

      if (!signedUrl) throw new Error("signedUrl is empty or undefined");

      return { uploadUrl: signedUrl, fileId: fileId };
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
      console.log("Failed to generate upload file url: ", error.message);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to generate upload file url"
      );
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
      setFileUploaded(context.auth.uid, fileId, 1);
      return 'SUCCESS';
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
    if (!data || !data.fileName || !data.fileSize || !data.fileType) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing arguments"
      );
    }
    if (data.fileSize > MAX_FILE_SIZE) throw new Error("The file is bigger than the max allowed file size" + MAX_FILE_SIZE.toString());
    try {
      const fileKey: string = `${context.auth.uid}/${data.fileDirectory}${data.fileName}`
      if (await doesFileExist(context.auth.uid, fileKey)) throw new Error("File with the same name already exists");
      const createMultiPartUploadCommand = new CreateMultipartUploadCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileKey,
      });
      const result = await r2.send(createMultiPartUploadCommand);
      const uploadId: string | undefined = result.UploadId;
      if (!uploadId) throw new Error("uploadId is empty or undefined");

      const fileToAdd: FileEntry = {
        fileKey: fileKey,
        fileName: data.fileName,
        fileType: data.fileType,
        fileSize: data.fileSize
      }
      const fileId: string = await addFileToDB(context.auth.uid, fileToAdd);

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
    if (!data || !data.fileName || !data.partNumber || !data.uploadId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing arguments"
      );
    }
    try {
      const fileKey: string = `${context.auth.uid}/${data.fileDirectory}${data.fileName}`;

      const uploadPartCommand = new UploadPartCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileKey,
        UploadId: data.uploadId,
        PartNumber: data.partNumber,
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
    if (!data || !data.fileName || !data.uploadId || !data.uploadResults || !data.fileId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing arguments"
      );
    }
    try {
      const fileKey: string = `${context.auth.uid}/${data.fileDirectory}${data.fileName}`;
      //console.log("Upload results: ", data.uploadResults);
      const completeCommand = new CompleteMultipartUploadCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileKey,
        UploadId: data.uploadId,
        MultipartUpload: {
          Parts: data.uploadResults.map(({ ETag, partNumber }) => {
            console.log("Part number: ", partNumber, " ETag: ", ETag);
            return ({
              ETag,
              PartNumber: partNumber,
            })
          }),
        },
      })

      const result = await r2.send(completeCommand);

      console.log("Complete multipart upload result: ", result);
      if (result.$metadata.httpStatusCode === 200) {
        setFileUploaded(context.auth.uid, data.fileId, data.uploadResults.length);
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
    if (!data || !data.fileName || !data.fileId || !data.uploadId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing arguments"
      );
    }
    try {
      const fileKey: string = `${context.auth.uid}/${data.fileDirectory}${data.fileName}`


      const abortCommand = new AbortMultipartUploadCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileKey,
        UploadId: data.uploadId,
      });

      const result = await r2.send(abortCommand);
      console.log("Abort multipart upload result: ", result);
      if (result.$metadata.httpStatusCode === 204) {
        deleteAbortedFileFromDB(context.auth.uid, data.fileId);
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

export const generateDownloadLink = functions.https.onCall(
  async (data: GenerateDownloadLinkParams, context) => {
    // Ensure the user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "The function must be called while authenticated."
      );
    }
    if (!data || !data.fileId || data.neverExpires == null || !data.expiresAt && data.neverExpires != null && data.neverExpires == false) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing arguments"
      );
    }

    try {
      const fileInfo = await getFileInfo(context.auth.uid, data.fileId);
      const numOfParts: number = fileInfo.numOfParts;
      const downloadLinks: string[] = [];

      for (let i = 0; i < numOfParts; i++) {
        const getObjectCommand = new GetObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: fileInfo.fileKey,
          PartNumber: i,
        })

        const signedUrl = await getSignedUrl(r2, getObjectCommand);
        if (!signedUrl) throw new Error("Failed to generate download link, Please try again later.");
        downloadLinks.push(signedUrl);
      }

      const linkInfo: LinkInfo = {
        downloadLinks: downloadLinks,
        isPublic: true,
        neverExpires: data.neverExpires,
        expiresAt: data.expiresAt
      }
      const downloadId = await addLinkToDB(context.auth.uid, data.fileId, linkInfo);
      const shareLink = `${WEBSITE_URL}/${context.auth.uid}/${data.fileId}/${downloadId}/view`;
      return { link: shareLink };

    } catch (error: any) {
      console.error('Error:', error.message);
      throw new functions.https.HttpsError("internal", "Internal Server Error", { message: error.message });
    }
  }
);
