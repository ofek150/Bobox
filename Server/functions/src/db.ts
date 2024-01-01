import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { FileEntry, LinkInfo, SharedFile, DownloadInfoParams, RenameFileParams } from "./utils/types";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

export const addLinkToDB = async (uid: string, fileId: string, linkInfo: LinkInfo) => {
    const db = admin.firestore();

    const fileDocRef = db.collection('users').doc(uid).collection('files').doc(fileId);
    //const jsDate: Date | null = !linkInfo.neverExpires && linkInfo.expiresAt ? new Date(linkInfo.expiresAt["$y"], linkInfo.expiresAt["$M"], linkInfo.expiresAt["$D"], linkInfo.expiresAt["$H"], linkInfo.expiresAt["$m"], linkInfo.expiresAt["$s"], linkInfo.expiresAt["$ms"]) : null;
    const expirationDate = new Date(linkInfo.expiresAt);
    const linkDocRef = await fileDocRef.collection('links').add({
        downloadLink: linkInfo.downloadLink,
        isPublic: linkInfo.isPublic,
        neverExpires: linkInfo.neverExpires,
        expiresAt: !linkInfo.neverExpires ? Timestamp.fromDate(expirationDate!) : null
    });

    return linkDocRef.id;
}

export const addFileToDB = async (uid: string, file: FileEntry) => {
    const db = admin.firestore();
    await db.collection('users').doc(uid).collection('files').doc(file.fileId).set(
        {
            fileKey: file.fileKey,
            fileName: file.fileName,
            fileType: file.fileType,
            fileSize: file.fileSize,
            uploadedAt: FieldValue.serverTimestamp(),
            folderId: file.folderId,
            status: 'In Progress'
        }
    );

    await db.collection('users').doc(uid).collection('folders').doc(file.folderId).update({
        files: FieldValue.arrayUnion(file.fileId)
    });
}

export const getFileInfo = async (uid: string, fileId: string) => {
    const db = admin.firestore();

    const docRef = await db.collection('users').doc(uid).collection('files').doc(fileId);
    const docSnap = await docRef.get();
    if (docSnap.exists) {
        const data = docSnap.data();
        if (!data) throw new Error("Requested file doesn't exist");;
        return data;
    }

    throw new Error("Requested file doesn't exist");
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

export const doesFileExist = async (uid: string, fileName: string, folderId: string) => {
    const db = admin.firestore();
    const folderDocRef = db.collection('users').doc(uid).collection('folders').doc(folderId);
    const folderDoc = await folderDocRef.get();

    if (!folderDoc.exists) {
      throw new Error('Folder not found');
    }

    const folderData = folderDoc.data();
    const filesInFolder = folderData!.files || [];

    for (const fileId of filesInFolder) {
      const fileDocRef = db.collection('users').doc(uid).collection('files').doc(fileId);
      const fileDoc = await fileDocRef.get();

      if (fileDoc.exists && fileDoc.data()?.fileName === fileName) {
        return true;
      }
    }

    return false;
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

export const getFileDownloadInfoFromDB = async (downloaderUid: string, ownerUid: string, fileId: string, downloadId: string) => {
    const db = admin.firestore();
    const fileDocRef = db.collection('users').doc(ownerUid).collection('files').doc(fileId);
    const fileDocSnap = await fileDocRef.get();

    const linkDocRef = fileDocRef.collection('links').doc(downloadId);
    const linkDocSnap = await linkDocRef.get();

    if (!fileDocSnap.exists || !linkDocSnap.exists) throw new Error('File or link does not exist');
    const fileInfo = fileDocSnap.data();
    const linkInfo = linkDocSnap.data();

    if (!fileInfo || !linkInfo) return null;
    //Later will check if that specific user is authorized but for now unless its public only the owner can download the file
    if (!linkInfo.isPublic && downloaderUid != ownerUid) throw new Error('Unauthorized');
    if (linkInfo.expiresAt && linkInfo.expiresAt.toDate() < new Date()) throw new Error('Download link has expired');
    console.log("Shared file expired at: ", fileInfo.uploadedAt.toDate().toString());
    const sharedFileInfo: SharedFile = {
        fileName: fileInfo.fileName,
        fileType: fileInfo.fileType,
        fileSize: fileInfo.fileSize,
        uploadedAt: fileInfo.uploadedAt.toDate().toString(),
        downloadLink: linkInfo.downloadLink,
    }

    return sharedFileInfo;
}

export const getFileDownloadInfo = functions.https.onCall(async (data: DownloadInfoParams, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User not authenticated');
        }
        const { ownerUid, fileId, downloadId } = data || {};

        if (!ownerUid || !fileId || !downloadId) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid or missing parameters');
        }

        const result = await getFileDownloadInfoFromDB(context.auth.uid, ownerUid, fileId, downloadId);
        return { fileInfo: result };
    } catch (error: any) {
        console.error('Error:', error.message);
        throw new functions.https.HttpsError('internal', 'Internal Server Error', { message: error.message });
    }
});

export const renameFile = functions.https.onCall(async (data: RenameFileParams, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User not authenticated');
        }

        const { fileId, newFileName } = data || {};

        if (!fileId || !newFileName) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid or missing parameters');
        }

        const db = admin.firestore();
        const fileDoc = await db.collection('users').doc(context.auth.uid).collection('files').doc(fileId).get();

        if (!fileDoc.exists) {
            throw new Error("Requested file does not exist");
        }

        const fileData = fileDoc.data();
        const oldFileName = fileData!.fileName;

        // Extract the file extension from the old file name
        const oldFileExtension = oldFileName.includes('.') ? oldFileName.split('.').pop() : '';

        // Create the new file name with the same extension
        const newFileNameWithExtension = newFileName + (oldFileExtension ? `.${oldFileExtension}` : '');

        // Update the file name in the database
        await db.collection('users').doc(context.auth.uid).collection('files').doc(fileId).update({
            fileName: newFileNameWithExtension,
        });

        return { success: true };
    } catch (error: any) {
        console.error('Error:', error.message);
        throw new functions.https.HttpsError('internal', 'Internal Server Error', { message: error.message });
    }
});


