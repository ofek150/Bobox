import * as admin from "firebase-admin";
import { FileEntry, LinkInfo } from "./utils/types";

export const addLinkToDB = async (uid: string, fileId: string, linkInfo: LinkInfo) => {
    const db = admin.firestore();

    const fileDocRef = db.collection('users').doc(uid).collection('files').doc(fileId);

    const linkDocRef = await fileDocRef.collection('links').add({
        downloadLinks: linkInfo.downloadLinks,
        isPublic: linkInfo.isPublic,
        neverExpires: linkInfo.neverExpires,
        expiresAt: linkInfo.neverExpires ? admin.firestore.Timestamp.fromDate(linkInfo.expiresAt as Date) : null
    });

    return linkDocRef.id;
};

export const addFileToDB = async (uid: string, file: FileEntry) => {
    const db = admin.firestore();
    const fileDocRef = await db.collection('users').doc(uid).collection('files').add(
        {
            fileKey: file.fileKey,
            fileName: file.fileName,
            fileType: file.fileType,
            fileSize: file.fileSize,
            uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'In Progress'
        }
    );
    return fileDocRef.id;
}

export const getFileInfo = async (uid: string, fileId: string) => {
    const db = admin.firestore();

    const docRef = await db.collection('users').doc(uid).collection('files').doc(fileId);
    const docSnap = await docRef.get();
    if (docSnap.exists) {
        const data = docSnap.data();
        if (!data) throw new Error("File not found");
        return data;
    }

    throw new Error("File not found")
}

export const setFileUploaded = async (uid: string, fileId: string, numOfParts: number) => {
    const db = admin.firestore();
    const docRef = db.collection('users').doc(uid).collection('files').doc(fileId);
    const docSnap = await docRef.get();
    if (docSnap.exists) {
        await docRef.update({
            status: 'Uploaded',
            numOfParts: numOfParts
        });
    }
}

export const doesFileExist = async (uid: string, fileKey: string) => {
    const db = admin.firestore();

    const querySnap = await db.collection('users').doc(uid).collection('files').where('fileKey', '==', fileKey).get();
    return !querySnap.empty;
}

export const deleteAbortedFileFromDB = async (uid: string, fileId: string) => {
    console.log("Deleting aborted file with fileId ", fileId, " of user with uid ", uid);
    const db = admin.firestore();

    const docRef = db.collection('users').doc(uid).collection('files').doc(fileId);
    const docSnap = await docRef.get();
    if (docSnap.exists) {
        await docRef.delete();
    }

    console.log("Deleted aborted file's entry with file id " + fileId, " of user with uid " + uid);
}