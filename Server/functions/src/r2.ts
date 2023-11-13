import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { S3Client, PutObjectCommand, CreateMultipartUploadCommand, UploadPartCommand,CompleteMultipartUploadCommand, AbortMultipartUploadCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { abortMultiPartUploadParameters, completeMultiPartParameters, uploadFileParameters, uploadPartParameters } from "./utils/types";

export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

export const generateUploadFileURL = functions.https.onCall(
  async (data: uploadFileParameters, context) => {
    // Ensure the user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "The function must be called while authenticated."
      );
    }
    
    if(!data || !data.fileName || !data.fileSize || !data.fileType){
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing arguments"
      );
    }
    try {
      const db = admin.firestore();
      console.log("Data: ", data);
      const fileKey: string = `${context.auth.uid}/${data.fileDirectory}${data.fileName}`

      const docRef = db.collection('users').doc(context.auth.uid).collection('files').doc();
      const docSnap = await docRef.get();
      if (!docSnap.exists) {
        await docRef.set({
          fileKey: fileKey,
          fileName: data.fileName,
          fileType: data.fileType,
          fileSize: data.fileSize
        });
      }
      else {
        //for now do nothing
      }

      const signedUrl = await getSignedUrl(
        r2,
        new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: fileKey,
          ContentType: data.fileType
        })
      );

      if(!signedUrl) throw new Error("signedUrl is empty or undefined");

      return signedUrl;
    } catch (error: any) {
      if (error & error.code && error.code.startsWith("auth/")) {
        throw new functions.https.HttpsError("invalid-argument", error.message);
      }
      console.log("Failed to generate upload file url: ", error.message);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to generate upload file url"
      );
    }
  }
);

export const initiateMultipartUpload = functions.https.onCall(
  async (data: uploadFileParameters, context) => {
    // Ensure the user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "The function must be called while authenticated."
      );
    }
    if(!data || !data.fileDirectory || !data.fileName || !data.fileSize || !data.fileType){
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing arguments"
      );
    }
    try {
      const fileKey: string = `${context.auth.uid}/${data.fileDirectory}${data.fileName}`
      const createMultiPartUploadCommand = new CreateMultipartUploadCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileKey,
      });
      const result = await r2.send(createMultiPartUploadCommand);
      const uploadId: string | undefined = result.UploadId;
      if(!uploadId) throw new Error("uploadId is empty or undefined");

      return uploadId;
      
    } catch (error: any) {
      if (error & error.code && error.code.startsWith("auth/")) {
        throw new functions.https.HttpsError("invalid-argument", error.message);
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
  async (data: uploadPartParameters, context) => {
    // Ensure the user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "The function must be called while authenticated."
      );
    }
    if(!data || !data.fileName || !data.partNumber || !data.uploadId){
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing arguments"
      );
    }
    try {
      const fileKey: string = `${context.auth.uid}/${data.fileDirectory}${data.fileName}`
      
      const uploadPartCommand = new UploadPartCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileKey,
        UploadId: data.uploadId,
        PartNumber: data.partNumber,
      })

      const signedUrl = await getSignedUrl(r2, uploadPartCommand);

      if(!signedUrl) throw new Error("signedUrl is empty or undefined");
      return signedUrl;
    } catch (error: any) {
      if (error & error.code && error.code.startsWith("auth/")) {
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
  async (data: completeMultiPartParameters, context) => {
    // Ensure the user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "The function must be called while authenticated."
      );
    }
    if(!data || !data.fileName || !data.uploadId || !data.uploadResults) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing arguments"
      );
    }
    try {
      const fileKey: string = `${context.auth.uid}/${data.fileDirectory}${data.fileName}`
      const completeCommand = new CompleteMultipartUploadCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileKey,
        UploadId: data.uploadId,
        MultipartUpload: {
          Parts: data.uploadResults.map(({ ETag }, i: number) => ({
            ETag,
            PartNumber: i + 1,
          })),
        },
      })

      const result = await r2.send(completeCommand);

      console.log("Complete multipart upload result: ", result);

    } catch (error: any) {
      if (error & error.code && error.code.startsWith("auth/")) {
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

export const AbortMultipartUpload = functions.https.onCall(
  async (data: abortMultiPartUploadParameters, context) => {
    // Ensure the user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "The function must be called while authenticated."
      );
    }
    if(!data || !data.fileName || !data.uploadId) {
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
      
    } catch (error: any) {
      if (error & error.code && error.code.startsWith("auth/")) {
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
