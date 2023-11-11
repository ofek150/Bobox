import * as functions from "firebase-functions";
//import * as admin from "firebase-admin";
import { S3Client } from "@aws-sdk/client-s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

interface uploadFileParameters {
  fileName: string;
}

export const uploadFile = functions.https.onCall(
  async (data: uploadFileParameters, context) => {
    try {
      // Ensure the user is authenticated
      if (!context.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "The function must be called while authenticated."
        );
      }
      const signedUrl = await getSignedUrl(
        r2,
        new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: data.fileName,
        }),
        { expiresIn: 60 }
      );
      return signedUrl;
    } catch (error: any) {
      if (error & error.code && error.code.startsWith("auth/")) {
        throw new functions.https.HttpsError("invalid-argument", error.message);
      }
      console.log("Error in user registration: ", error.message);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to register user"
      );
    }
  }
);
