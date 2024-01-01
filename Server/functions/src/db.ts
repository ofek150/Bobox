import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { FileEntry, LinkInfo, SharedFile, DownloadInfoParams, Files, File } from "./utils/types";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { formatDateToDDMMYYYY } from "./utils/helpers";
import { addPrivateDownloadLink } from "./r2";

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
};

export const addFileToDB = async (uid: string, file: FileEntry) => {
    const db = admin.firestore();
    const fileDocRef = await db.collection('users').doc(uid).collection('files').add(
        {
            fileKey: file.fileKey,
            fileName: file.fileName,
            fileType: file.fileType,
            fileSize: file.fileSize,
            uploadedAt: FieldValue.serverTimestamp(),
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

    throw new Error("Requested file not found");
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

export const updatePrivateLinkDownloadId = async (uid: string, fileId: string, downloadId: string) => {
    const db = admin.firestore();
    const docRef = db.collection('users').doc(uid).collection('files').doc(fileId);
    const docSnap = await docRef.get();
    if (docSnap.exists) {
        await docRef.update({
            privateLinkDownloadId: downloadId,
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

export const getFileDownloadInfoFromDB = async (downloaderUid: string, ownerUid: string, fileId: string, downloadId: string) => {
    const db = admin.firestore();
    const fileDocRef = db.collection('users').doc(ownerUid).collection('files').doc(fileId);
    const fileDocSnap = await fileDocRef.get();

    const linkDocRef = fileDocRef.collection('links').doc(downloadId);
    const linkDocSnap = await linkDocRef.get();

    if (!fileDocSnap.exists || !linkDocSnap.exists) throw new Error('File or link does not exist');
    const fileInfo = fileDocSnap.data();
    const linkInfo = linkDocSnap.data();

    if (!fileInfo || !linkInfo) throw new Error('File or link does not exist');
    //Later will check if that specific user is authorized but for now unless its public only the owner can download the file
    if (!linkInfo.isPublic && downloaderUid != ownerUid) throw new Error('Unauthorized');
    if (linkInfo.expiresAt && linkInfo.expiresAt.toDate() < new Date()) throw new Error('Download link has expired');


    const sharedFileInfo: SharedFile = {
        fileName: fileInfo.fileName,
        fileType: fileInfo.fileType,
        fileSize: fileInfo.fileSize,
        uploadedAt: fileInfo.uploadedAt.toDate().toString(),
        downloadLink: linkInfo.downloadLink,
    }

    return sharedFileInfo;
}

export const getFilePrivateDownloadIdFromDB = async (userId: string, fileId: string) => {
    const db = admin.firestore();
    const fileDocRef = db.collection('users').doc(userId).collection('files').doc(fileId);
    const fileDocSnap = await fileDocRef.get();


    if (!fileDocSnap.exists) throw new Error('File does not exist');
    const fileInfo = fileDocSnap.data();

    if (!fileInfo) throw new Error('File does not exist');
    console.log("File info: ", fileInfo);
    return fileInfo.privateLinkDownloadId;
}

export const getFileDownloadInfo = functions.https.onCall(async (data: DownloadInfoParams, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User not authenticated');
        }
        const { ownerUid, fileId, downloadId } = data;

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

export const getAllFilesOfUserFromDB = async (userId: string) => {
    const db = admin.firestore();
    const fileDocRef = db.collection('users').doc(userId).collection('files');

    try {
        const snapshot = await fileDocRef.get();

        if (snapshot.empty) {
            return { files: [] };
        }

        const filesData: File[] = [];


        snapshot.forEach((doc) => {
            const data = doc.data();
            const uploadedAtDate: Date = data.uploadedAt.toDate();

            const file: File = {
                fileId: doc.id,
                fileName: data.fileName,
                fileType: data.fileType,
                fileSize: data.fileSize,
                uploadedAt: formatDateToDDMMYYYY(uploadedAtDate)
            };

            filesData.push(file);
        });

        const files: Files = { files: filesData };

        return files;
    } catch (error) {
        console.error('Error getting documents', error);
        throw new Error('Failed to fetch files from the db');
    }
}

export const getAllFilesOfUser = functions.https.onCall(async (data: any, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User not authenticated');
        }

        return await getAllFilesOfUserFromDB(context.auth.uid);
    } catch (error: any) {
        console.error('Error:', error.message);
        throw new functions.https.HttpsError('internal', 'Internal Server Error', { message: error.message });
    }
});


export const generatePrivateDownloadLink = functions.https.onCall(async (fileId: string, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User not authenticated');
        }
        const fileInfo: any = await getFileInfo(context.auth.uid, fileId);
        try {
            const result = await getFileDownloadInfoFromDB(context.auth.uid, context.auth.uid, fileId, fileInfo.privateLinkDownloadId);
            return { downloadLink: result.downloadLink };

        } catch (error: any) {
            if (error.message === "Download link has expired") {
                // Generate new link to download
                await addPrivateDownloadLink(context.auth.uid, fileId);
                const result = await getFileDownloadInfoFromDB(context.auth.uid, context.auth.uid, fileId, fileInfo.privateLinkDownloadId);
                return { downloadLink: result.downloadLink };
            }
        }
        throw new Error("Failed generating download link");
    } catch (error: any) {
        console.error('Error:', error.message);
        throw new functions.https.HttpsError('internal', 'Internal Server Error', { message: error.message });
    }
});

export const getPrivateDownloadId = functions.https.onCall(async (fileId: string, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User not authenticated');
        }
        try {
            const downloadId = await getFilePrivateDownloadIdFromDB(context.auth.uid, fileId);
            return { downloadId: downloadId };

        } catch (error: any) {
            if (error.message === "Download link has expired") {
                // Generate new link to download
                await addPrivateDownloadLink(context.auth.uid, fileId);
                const downloadId = await getFilePrivateDownloadIdFromDB(context.auth.uid, fileId);
                return { downloadId: downloadId };
            }
        }
        throw new Error("Failed generating download link");
    } catch (error: any) {
        console.error('Error:', error.message);
        throw new functions.https.HttpsError('internal', 'Internal Server Error', { message: error.message });
    }
});



