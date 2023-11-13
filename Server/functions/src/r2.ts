import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { uploadFileParameters } from "./utils/types";

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
    try {
      // Ensure the user is authenticated
      if (!context.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "The function must be called while authenticated."
        );
      }

      const db = admin.firestore();
      console.log("Data: ", data);
      const fileKey: string = `${context.auth.uid}/${data.fileName}`

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
        }),
        { expiresIn: 60 }
      );
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