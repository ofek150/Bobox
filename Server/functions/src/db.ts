import * as admin from "firebase-admin";
import { FileEntry } from "./utils/types";

export const addFileToDB = async (uid: string, file: FileEntry) => {
    const db = admin.firestore();

    const docRef = db.collection('users').doc(uid).collection('files').doc();
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
        await docRef.set({
            fileKey: file.fileKey,
            fileName: file.fileName,
            fileType: file.fileType,
            fileSize: file.fileSize,
            status: 'In Progress'
        });

    }
    return docRef.id;
}
export const setFileUploaded = async (uid: string, fileId: string) => {
    const db = admin.firestore();

    const docRef = db.collection('users').doc(uid).collection('files').doc(fileId);
    const docSnap = await docRef.get();
    if (docSnap.exists) {
        await docRef.update({
            status: 'Uploaded'
        });
    }
}