import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { FileEntry, LinkInfo, SharedFile, DownloadInfoParams, Files, File, RenameFileParams, CreateFolderParams, Folder, MoveFileToFolderParams, RenameFolderParams } from "./utils/types";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { formatDateToDDMMYYYY } from "./utils/helpers";
import { addPrivateDownloadLink } from "./r2";


const deleteCollection = async (db: any, collectionPath: string, batchSize: number) => {
    const collectionRef = db.collection(collectionPath);
    const query = collectionRef.orderBy('__name__').limit(batchSize);

    return new Promise((resolve, reject) => {
        deleteQueryBatch(db, query, batchSize, resolve, reject);
    });
};

const deleteQueryBatch = async (db: any, query: any, batchSize: number, resolve: any, reject: any) => {
    try {
        const snapshot = await query.get();

        if (snapshot.size === 0) {
            // All documents in the collection have been deleted
            return resolve();
        }

        // Delete documents in a batch
        const batch = db.batch();
        snapshot.docs.forEach((doc: any) => {
            batch.delete(doc.ref);
        });

        await batch.commit();

        // Recursively delete the next batch
        process.nextTick(() => {
            deleteQueryBatch(db, query, batchSize, resolve, reject);
        });
    } catch (error) {
        return reject(error);
    }
};

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
        if (!data) throw new Error("Requested file doesn't exist");
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

export const deleteFileFromDB = async (uid: string, fileId: string) => {
    console.log("Deleting file with fileId ", fileId, " of user with uid ", uid);
    const db = admin.firestore();
    // Delete the file from the 'files' collection
    const fileDocRef = db.collection('users').doc(uid).collection('files').doc(fileId);
    const fileDocSnap = await fileDocRef.get();

    const collectionPath = `users/${uid}/files/${fileId}/links`;
    const batchSize = 500;

    if (fileDocSnap.exists) {
        await fileDocRef.delete();
        console.log("Deleted file document with fileId ", fileId, " from 'files' collection.");
        await deleteCollection(db, collectionPath, batchSize);
    } else {
        console.log("File document with fileId ", fileId, " not found in 'files' collection.");
    }

    // Update the 'files' array in the 'folders' collection
    const foldersRef = db.collection('users').doc(uid).collection('folders');
    const foldersQuery = foldersRef.where('files', 'array-contains', fileId);
    const foldersSnapshot = await foldersQuery.get();

    if (!foldersSnapshot.empty) {
        const folderDoc = foldersSnapshot.docs[0];
        const updatedFilesArray = folderDoc.data().files.filter((file: string) => file !== fileId);

        await folderDoc.ref.update({ files: updatedFilesArray });
        console.log("Updated 'files' array in folder document.");
    } else {
        console.log("File with fileId ", fileId, " not found in any folders of user with uid ", uid);
    }
};

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

export const getAllFilesOfUserFromDB = async (userId: string) => {
    const db = admin.firestore();
    const filesCollectionRef = db.collection('users').doc(userId).collection('files');
    const foldersCollectionRef = db.collection('users').doc(userId).collection('folders');

    try {
        const filesSnapshot = await filesCollectionRef.get();
        const foldersSnapshot = await foldersCollectionRef.get();

        if (foldersSnapshot.empty) {
            return { files: [], folders: [] };
        }

        const filesData: File[] = [];

        filesSnapshot.forEach((doc) => {
            const data = doc.data();
            if (!data) return;
            if (data.status != "Uploaded") return;
            console.log("File data: ", data);
            const uploadedAtDate: Date = data.uploadedAt.toDate();

            const file: File = {
                fileId: doc.id,
                fileName: data.fileName,
                fileType: data.fileType,
                fileSize: data.fileSize,
                uploadedAt: formatDateToDDMMYYYY(uploadedAtDate),
                folderId: data.folderId
            };

            filesData.push(file);
        });

        const foldersData: Folder[] = [];

        foldersSnapshot.forEach((doc) => {
            const data = doc.data();
            if (!data) return;
            console.log("Folder data: ", data);
            let createdAtDate: Date | null = null;
            if (data.createdAt) createdAtDate = data.createdAt.toDate();

            const folder: Folder = {
                folderId: doc.id,
                folderName: data.folderName,
                inFolder: data.inFolder,
                createdAt: createdAtDate ? formatDateToDDMMYYYY(createdAtDate) : null,
                files: data.files
            };

            foldersData.push(folder);
        });

        console.log("Folders: ", foldersData);
        const files: Files = { folders: foldersData, files: filesData };

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

export const renameFile = functions.https.onCall(async (data: RenameFileParams, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User not authenticated');
        }

        console.log(data);
        const { fileId, newFileName } = data || {};

        console.log("FileId: ", fileId, " New file name: ", newFileName);

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

        const oldFileExtension = oldFileName.includes('.') ? oldFileName.split('.').pop() : '';

        console.log("old file extension: ", oldFileExtension);

        const newFileNameWithExtension = newFileName + (oldFileExtension ? `.${oldFileExtension}` : '');
        console.log("New file name with extension: ", newFileNameWithExtension);

        await db.collection('users').doc(context.auth.uid).collection('files').doc(fileId).update({
            fileName: newFileNameWithExtension,
        });

        return { success: true };
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

export const doesFolderExist = async (uid: string, folderId: string) => {
    const db = admin.firestore();
    const folderDocRef = db.collection('users').doc(uid).collection('folders').doc(folderId);
    const folderDoc = await folderDocRef.get();

    return folderDoc.exists;
}

export const doesFolderNameExistInFolder = async (uid: string, inFolder: string, folderName: string) => {
    const db = admin.firestore();

    const folderDocRef = db.collection('users').doc(uid).collection('folders').where('inFolder', '==', inFolder).where('folderName', '==', folderName);
    const folderDocs = await folderDocRef.get();
    return !folderDocs.empty;
};

export const createFolder = functions.https.onCall(async (data: CreateFolderParams, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User not authenticated');
        }
        const { folderName, inFolder } = data || {};

        if (!folderName || !inFolder) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid or missing parameters');
        }

        if (!(await doesFolderExist(context.auth.uid, inFolder))) throw new Error("Invalid inFolder id");

        if (await doesFolderNameExistInFolder(context.auth.uid, inFolder, folderName)) throw new Error("Folder with the same name already exist in the current folder!");

        const db = admin.firestore();
        const folderDoc = await db.collection('users').doc(context.auth.uid).collection("folders").doc();
        await folderDoc.set({
            inFolder: inFolder,
            folderName: folderName,
            createdAt: FieldValue.serverTimestamp(),
            files: []
        });

        return { success: true };
    } catch (error: any) {
        console.error('Error:', error.message);
        throw new functions.https.HttpsError('internal', 'Internal Server Error', { message: error.message });
    }

});

export const moveFileToFolder = functions.https.onCall(async (data: MoveFileToFolderParams, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User not authenticated');
        }

        const { fileId, currentFolderId, newFolderId } = data || {};

        if (!fileId || !currentFolderId || !newFolderId) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid or missing parameters');
        }

        const db = admin.firestore();

        // Check if the file exists in the current folder
        const currentFolderRef = db.collection('users').doc(context.auth.uid).collection('folders').doc(currentFolderId);
        const currentFolderDoc = await currentFolderRef.get();

        if (!currentFolderDoc.exists) {
            throw new Error("Current folder not found");
        }

        const currentFolderData = currentFolderDoc.data();
        const currentFilesArray: string[] = currentFolderData!.files || [];

        if (!currentFilesArray.includes(fileId)) {
            throw new Error("File not found in the current folder");
        }

        // Remove file from the current folder's files array
        const updatedCurrentFilesArray = currentFilesArray.filter(file => file !== fileId);
        await currentFolderRef.update({ files: updatedCurrentFilesArray });

        // Add the file to the files array of the new folder
        const newFolderRef = db.collection('users').doc(context.auth.uid).collection('folders').doc(newFolderId);
        const newFolderDoc = await newFolderRef.get();

        if (!newFolderDoc.exists) {
            throw new Error("New folder not found");
        }

        const newFolderData = newFolderDoc.data();
        const newFilesArray: string[] = newFolderData!.files || [];

        await newFolderRef.update({ files: [...newFilesArray, fileId] });

        // Update the file document with the new folderId
        const fileDocRef = db.collection('users').doc(context.auth.uid).collection('files').doc(fileId);
        await fileDocRef.update({ folderId: newFolderId });

        return { success: true };
    } catch (error: any) {
        console.error('Error:', error.message);
        throw new functions.https.HttpsError('internal', 'Internal Server Error', { message: error.message });
    }
});
export const renameFolder = functions.https.onCall(async (data: RenameFolderParams, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User not authenticated');
        }
        const { folderId, newFolderName } = data || {};
        if (!folderId || !newFolderName) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid or missing parameters');
        }

        if (folderId === "root") throw new Error("Cannot change name of root folder");
        const db = admin.firestore();
        const folderDocRef = db.collection('users').doc(context.auth.uid).collection('folders').doc(folderId);
        const folderDoc = await folderDocRef.get();
        if (!folderDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Folder not found');
        }
        await folderDocRef.update({
            'folderName': newFolderName
        });
        return { success: true };

    } catch (error: any) {
        console.error('Error:', error.message);
        throw new functions.https.HttpsError('internal', 'Internal Server Error', { message: error.message });
    }
});
