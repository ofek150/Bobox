import * as functions from "firebase-functions";
import { FileEntry, LinkInfo, SharedFile, DownloadInfoParams, RenameFileParams, CreateFolderParams, MoveFileToFolderParams, RenameFolderParams, ShareFileParams, ShareFolderParams } from "./utils/types.js";
import { ACCESS_LEVEL, SEVEN_DAYS_SECONDS, WEBSITE_URL } from "./utils/constants.js";
import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";
import { deleteFileFromCloudStorage, deleteFilesFromCloudStorage, generateDownloadLink } from "./r2.js";
import * as nodemailer from 'nodemailer';
import 'dotenv/config'


export const getFolderById = async (uid: string, folderId: string) => {
    const db = getFirestore();

    const docRef = await db.collection('users').doc(uid).collection('folders').doc(folderId);
    const docSnap = await docRef.get();
    if (docSnap.exists) {
        let data = docSnap.data();
        if (!data) return null;
        if (data.shared) {
            const sharedFolderDocRef = data.sharedFolderRef;
            const sharedFolderDoc = await sharedFolderDocRef.get();
            if (sharedFolderDoc.exists) {
                data = sharedFolderDoc.data();
            }
        }
        if (!data) return null;
        return data;
    }

    return null;
}

export const getFolderRefById = async (uid: string, folderId: string) => {
    const db = getFirestore();
    const docRef = await db.collection('users').doc(uid).collection('folders').doc(folderId);
    const docSnap = await docRef.get();
    let ref = docRef;
    if (docSnap.exists) {
        const data = docSnap.data();
        if (!data) return null;
        if (data.shared && data.sharedFolderRef) {
            ref = data.sharedFolderRef;
            if (!(await ref.get()).exists) return null;
        }
    }
    else {
        return null;
    }
    return ref;
}

export const getUserRefById = async (uid: string) => {
    const db = getFirestore();
    const docRef = await db.collection('users').doc(uid)
    const docSnap = await docRef.get();
    if (docSnap.exists) {
        const data = docSnap.data();
        if (!data) return null;
    }
    else {
        return null;
    }
    return docRef;
}


export const addLinkToDB = async (uid: string, fileId: string, linkInfo: LinkInfo) => {
    const fileRef = await getFileRefById(uid, fileId);
    if (!fileRef) throw new functions.https.HttpsError('not-found', 'File not found');

    const expirationDate = new Date(linkInfo.expiresAt);
    const linkDocRef = await fileRef.collection('links').add({
        downloadLink: linkInfo.downloadLink,
        isPublic: linkInfo.isPublic,
        isPermanent: linkInfo.isPermanent,
        expiresAt: Timestamp.fromDate(expirationDate)
    });

    await linkDocRef.update({
        downloadId: linkDocRef.id
    });

    return linkDocRef.id;
}

export const addFileToDB = async (userId: string, file: FileEntry) => {
    const db = getFirestore();
    const parentFolder = await getFolderById(userId, file.parentFolderId);
    if (!parentFolder) throw new Error("Parent folder not found");

    const userRef = await getUserRefById(userId);
    if (!userRef) throw new Error('Unexpected error occurred');

    const user = (await userRef.get()).data();

    if (user!.totalFileSize + file.fileSize > user!.maxTotalFileSize) {
        throw new functions.https.HttpsError(
            'invalid-argument', // Error code indicating an invalid argument (in this case, exceeding the limit)
            'Adding this file would exceed the user\'s maximum total file size limit.' // Error message providing more information
        );
    }

    if (user!.totalFileSize + file.fileSize == user!.maxTotalFileSize) {
        throw new functions.https.HttpsError(
            'resource-exhausted',
            'User has exceeded the maximum total file size limit.'
        );
    }


    const fileRef = db.collection('users').doc(parentFolder.ownerUid).collection('files').doc(file.fileId);
    await fileRef.set(
        {
            fileKey: file.fileKey,
            fileName: file.fileName,
            fileType: file.fileType,
            fileSize: file.fileSize,
            uploadedAt: FieldValue.serverTimestamp(),
            parentFolderId: file.parentFolderId,
            status: 'In Progress',
            collaborators: parentFolder ? parentFolder.collaborators : {},
            shared: false,
            ownerUid: parentFolder.ownerUid
        }
    );
}

export const getFileById = async (uid: string, fileId: string) => {
    const db = getFirestore();

    const docRef = await db.collection('users').doc(uid).collection('files').doc(fileId);
    const docSnap = await docRef.get();
    if (docSnap.exists) {
        let data = docSnap.data();
        if (!data) return null;
        if (data.shared) {
            const sharedFileDocRef = data.sharedFileRef;
            const sharedFileDocSnap = await sharedFileDocRef.get();
            if (sharedFileDocSnap.exists) {
                data = sharedFileDocSnap.data();
            }
        }
        if (!data) return null;
        return data;
    }

    return null;
}

export const getFileRefById = async (uid: string, fileId: string, create: boolean = false) => {
    const db = getFirestore();

    const docRef = await db.collection('users').doc(uid).collection('files').doc(fileId);
    const docSnap = await docRef.get();
    let ref = docRef;
    if (create) return ref;
    if (docSnap.exists) {
        const data = docSnap.data();
        if (!data) return null;
        if (data.shared && data.sharedFileRef) {
            ref = data.sharedFileRef;
            if (!(await ref.get()).exists) return null;
        }
    }
    return ref;
}

export const setFileUploaded = async (uid: string, fileId: string, numOfParts: number) => {
    const fileRef = await getFileRefById(uid, fileId);
    if (!fileRef) return false;
    await fileRef.update({
        status: 'Uploaded',
        numOfParts: numOfParts
    });

    const file = (await fileRef.get()).data();
    if (!file) throw new Error('Unexpected error occurred');

    const parentFolderRef = await getFolderRefById(uid, file.parentFolderId);
    if (!parentFolderRef) throw new Error("Parent folder not found");

    const parentFolder = (await parentFolderRef.get()).data();
    if (!parentFolder) throw new Error('Unexpected error occurred');

    await parentFolderRef!.update({
        files: FieldValue.arrayUnion(fileId)
    });

    const userRef = await getUserRefById(uid);
    if (!userRef) throw new Error('Unexpected error occurred');


    await userRef.update({ totalFileSize: FieldValue.increment(file.fileSize) });


    if (!parentFolder.collaborators) return;

    for (const [key] of Object.entries(parentFolder.collaborators)) {
        await addSharedFileEntryToCollaborator(key, file.fileId, fileRef);
    }
    return true;
}

export const isUniqueFileName = async (uid: string, fileName: string, folderId: string) => {
    const parentFolder = await getFolderById(uid, folderId);
    if (!parentFolder) return false;
    const filesInFolder = parentFolder!.files || [];

    for (const fileId of filesInFolder) {
        const file = await getFileById(uid, fileId)
        if (!file) continue;

        if (file!.fileName === fileName) {
            if (file!.status !== 'Uploaded') {
                await deleteFileFromDB(uid, fileId);
                return false;
            }
            return true;
        }
    }

    return false;
}

export const deleteFileFromDB = async (uid: string, fileId: string) => {
    console.log("Deleting file with fileId ", fileId, " of user with uid ", uid);
    const db = getFirestore();
    // Delete the file from the 'files' collection
    const fileRef = await getFileRefById(uid, fileId);
    if (!fileRef) return;

    const file = (await fileRef.get()).data();
    await db.recursiveDelete(fileRef);

    if (file!.collaborators) {
        for (const [key] of Object.entries(file!.collaborators)) {
            await deleteSharedFileEntryFromCollaborator(key, fileId);
        }
    }

    // Update the 'files' array in the 'folders' collection
    const folderRef = await getFolderRefById(uid, file!.parentFolderId);
    if (!folderRef) return;
    await folderRef.update({ files: FieldValue.arrayRemove(fileId) });

    await fileRef.delete();
    const userRef = await getUserRefById(uid);
    if (!userRef) throw new Error('Unexpected error occurred');

    await userRef.update({ totalFileSize: FieldValue.increment(-file!.fileSize) });
};

export const getFileDownloadInfoFromDB = async (downloaderUid: string, ownerUid: string, fileId: string, downloadId: string) => {
    const fileRef = await getFileRefById(ownerUid, fileId);
    if (!fileRef) throw new functions.https.HttpsError('not-found', 'File not found');
    const fileData = (await fileRef.get()).data();

    const linkDocRef = fileRef.collection('links').doc(downloadId);
    const linkDocSnap = await linkDocRef.get();

    if (!linkDocSnap.exists) throw new Error('File or link does not exist');
    const file = fileData;
    const linkInfo = linkDocSnap.data();

    if (!file || !linkInfo) throw new Error('File or link does not exist');

    if (!linkInfo.isPublic && (downloaderUid != ownerUid && !file.collaborators[downloaderUid])) throw new functions.https.HttpsError('permission-denied', "You are not allowed to access this file");

    let downloadLink = linkInfo.downloadLink;
    if (!linkInfo.isPermanent && linkInfo.expiresAt && linkInfo.expiresAt.toDate() < new Date()) {
        await linkDocRef.delete();
        throw new functions.https.HttpsError('invalid-argument', 'Download link has expired');
    }
    else if (linkInfo.isPermanent && linkInfo.expiresAt && linkInfo.expiresAt.toDate() < new Date()) {
        downloadLink = await generateDownloadLink(fileData.fileKey, SEVEN_DAYS_SECONDS);
        const currentDate = new Date();
        const expirationDate = new Date(currentDate);
        expirationDate.setDate(currentDate.getDate() + 7);
        await linkDocRef.update({
            downloadLink: downloadLink,
            expiresAt: Timestamp.fromDate(expirationDate)
        });
    }

    const sharedFileInfo: SharedFile = {
        fileName: file.fileName,
        fileType: file.fileType,
        fileSize: file.fileSize,
        uploadedAt: file.uploadedAt.toDate().toString(),
        downloadId: linkInfo.downloadId,
        downloadLink: downloadLink,
    }

    return sharedFileInfo;
}

export const getFilePrivateDownloadIdFromDB = async (userId: string, fileId: string) => {
    const file = await getFileById(userId, fileId);

    if (!file) throw new functions.https.HttpsError('not-found', 'File not found');
    return file.privateLinkDownloadId;
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
        if (error instanceof functions.https.HttpsError) throw error;
        else throw new functions.https.HttpsError('internal', 'Internal Server Error', { message: error.message });
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

        const fileRef = await getFileRefById(context.auth.uid, fileId);

        if (!fileRef) throw new functions.https.HttpsError('not-found', 'File not found');

        const file = (await fileRef.get()).data();

        const accessLevel: ACCESS_LEVEL = getCollaboratorAccessLevel(file, context.auth.uid);
        if (file!.ownerUid != context.auth.uid && accessLevel > ACCESS_LEVEL.OPERATOR) throw new functions.https.HttpsError('permission-denied', 'You are not allowed to rename this file');

        const oldFileName = file!.fileName;
        const oldFileExtension = oldFileName.includes('.') ? oldFileName.split('.').pop() : '';
        const newFileNameWithExtension = newFileName + (oldFileExtension ? `.${oldFileExtension}` : '');

        await fileRef.update({
            fileName: newFileNameWithExtension
        });

        return { success: true };
    } catch (error: any) {
        console.error('Error:', error.message);
        if (error instanceof functions.https.HttpsError) throw error;
        else throw new functions.https.HttpsError('internal', 'Internal Server Error', { message: error.message });
    }
});

export const updatePrivateLinkDownloadId = async (uid: string, fileId: string, downloadId: string) => {
    const fileRef = await getFileRefById(uid, fileId);
    if (!fileRef) throw new Error("File not found");
    await fileRef.update({
        privateLinkDownloadId: downloadId
    });
}

export const doesFolderExist = async (uid: string, folderId: string) => {
    const db = getFirestore();
    const folderDocRef = db.collection('users').doc(uid).collection('folders').doc(folderId);
    const folderDoc = await folderDocRef.get();

    return folderDoc.exists;
}

export const doesFolderNameExistInFolder = async (uid: string, parentFolderId: string, folderName: string) => {
    const db = getFirestore();

    const folderDocRef = db.collection('users').doc(uid).collection('folders').where('parentFolderId', '==', parentFolderId).where('folderName', '==', folderName);
    const folderDocs = await folderDocRef.get();
    return !folderDocs.empty;
};

export const createFolder = functions.https.onCall(async (data: CreateFolderParams, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User not authenticated');
        }
        const { folderName, parentFolderId } = data || {};

        if (!folderName || !parentFolderId) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid or missing parameters');
        }

        if (parentFolderId === 'shared') throw new functions.https.HttpsError('permission-denied', 'You are not allowed to create folders here');

        const parentFolderRef = await getFolderRefById(context.auth.uid, parentFolderId);
        if (!parentFolderRef) throw new functions.https.HttpsError('invalid-argument', 'Parent folder does not exist');
        const parentFolder = (await parentFolderRef.get()).data();
        if (!parentFolder) throw new Error('Unknown error occurred');

        const accessLevel: ACCESS_LEVEL = getCollaboratorAccessLevel(parentFolder, context.auth.uid);
        if (parentFolder.ownerUid != context.auth.uid && accessLevel > ACCESS_LEVEL.ADMIN) throw new functions.https.HttpsError('permission-denied', 'You are not allowed to create folders here');

        const db = getFirestore();


        if (await doesFolderNameExistInFolder(context.auth.uid, parentFolderId, folderName)) throw new functions.https.HttpsError('already-exists', 'Folder with the same name already exist in the current folder!');



        const collaborators: any = parentFolder.collaborators ?? {};

        const folderDocRef = db.collection('users').doc(parentFolder.ownerUid).collection("folders").doc();
        await folderDocRef.set({
            parentFolderId: parentFolderId,
            folderName: folderName,
            createdAt: FieldValue.serverTimestamp(),
            files: [],
            folders: [],
            collaborators: collaborators,
            shared: false,
            ownerUid: parentFolder.ownerUid
        });

        parentFolderRef.update({
            folders: FieldValue.arrayUnion(folderDocRef.id)
        });

        if (collaborators) {
            for (const [key] of Object.entries(collaborators)) {
                console.log("Collaborator key: " + key);
                await addSharedFolderEntryToCollaborator(key, folderDocRef.id, folderDocRef);
            }
        }


        return { success: true };
    } catch (error: any) {
        console.error('Error:', error.message);
        if (error instanceof functions.https.HttpsError) throw error;
        else throw new functions.https.HttpsError('internal', 'Internal Server Error', { message: error.message });
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

        if (currentFolderId === newFolderId) throw new functions.https.HttpsError('already-exists', 'File already exists in that folder');
        if (newFolderId === "shared") throw new Error("You are not allowed to upload files here");

        const fileRef = await getFileRefById(context.auth.uid, fileId);
        if (!fileRef) throw new functions.https.HttpsError('not-found', 'File not found');

        const fileData = (await fileRef.get()).data();
        if (context.auth.uid != fileData?.ownerUid) throw new functions.https.HttpsError('permission-denied', 'Only the owner can move shared file');

        // Check if the file exists in the current folder
        const currFolderId = currentFolderId === "shared" ? "root" : currentFolderId
        const currentFolderRef = await getFolderRefById(context.auth.uid, currFolderId);
        if (!currentFolderRef) throw new functions.https.HttpsError('not-found', 'Current folder not found');


        const currentFolderData = (await currentFolderRef.get()).data();
        const currentFilesArray: string[] = currentFolderData!.files || [];

        if (!currentFilesArray.includes(fileId)) {
            throw new Error("File not found in the current folder");
        }

        await currentFolderRef.update({ files: FieldValue.arrayRemove(fileId) });

        const newFolderRef = await getFolderRefById(context.auth.uid, newFolderId);
        if (!newFolderRef) throw new functions.https.HttpsError('not-found', 'New folder not found');

        await newFolderRef.update({ files: FieldValue.arrayUnion(fileId) });

        await fileRef.update({ parentFolderId: newFolderId });

        return { success: true };
    } catch (error: any) {
        console.error('Error:', error.message);
        if (error instanceof functions.https.HttpsError) throw error;
        else throw new functions.https.HttpsError('internal', 'Internal Server Error', { message: error.message });
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

        if (folderId === "root") throw new functions.https.HttpsError('permission-denied', 'Cannot rename root folder');
        if (folderId === "shared") throw new functions.https.HttpsError('permission-denied', 'Cannot rename shared folder');

        const folderRef = await getFolderRefById(context.auth.uid, folderId);
        if (!folderRef) {
            throw new functions.https.HttpsError('not-found', 'Folder not found');
        }
        const folder = (await folderRef.get()).data();

        const accessLevel: ACCESS_LEVEL = getCollaboratorAccessLevel(folder, context.auth.uid);
        if (folder!.ownerUid != context.auth.uid && accessLevel > ACCESS_LEVEL.OPERATOR) throw new functions.https.HttpsError('permission-denied', 'You are not allowed to rename this folder');

        await folderRef.update({
            'folderName': newFolderName
        });
        return { success: true };

    } catch (error: any) {
        console.error('Error:', error.message);
        if (error instanceof functions.https.HttpsError) throw error;
        else throw new functions.https.HttpsError('internal', 'Internal Server Error', { message: error.message });
    }
});

const getUserByEmail = async (email: string) => {
    const db = getFirestore();
    try {
        const querySnapshot = await db.collection('users').where('email', '==', email).get();

        if (querySnapshot.empty) return null;
        else {
            const user = querySnapshot.docs[0].data();
            return user;
        }
    } catch (error) {
        console.error('Error getting user by email:', error);
        throw error;
    }
};

const getUserById = async (userId: string) => {
    const db = getFirestore();
    try {
        const documentSnapshot = await db.collection('users').doc(userId).get();

        if (!documentSnapshot.exists) return null;
        else {
            const user = documentSnapshot.data();
            return user;
        }
    } catch (error) {
        console.error('Error getting user by ID:', error);
        throw error;
    }
};

const getInvitationById = async (invitationId: string) => {
    const db = getFirestore();
    try {
        const documentSnapshot = await db.collection('invitations').doc(invitationId).get();

        if (!documentSnapshot.exists) return null;
        else {
            const invitation = documentSnapshot.data();
            return invitation;
        }
    } catch (error) {
        console.error('Error getting invitation by ID:', error);
        throw error;
    }
};

export const shareFileWithUserByEmail = functions.https.onCall(async (data: ShareFileParams, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User not authenticated');
        }
        const { email, fileId, accessLevel } = data || {};
        if (!email || !fileId || !accessLevel || accessLevel < ACCESS_LEVEL.ADMIN || accessLevel > ACCESS_LEVEL.VIEWER) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid or missing parameters');
        }

        const file = await getFileById(context.auth.uid, fileId);
        if (!file) throw new functions.https.HttpsError('not-found', 'File not found');

        const userAccessLevel: ACCESS_LEVEL = getCollaboratorAccessLevel(file, context.auth.uid);
        if (file.ownerUid != context.auth.uid && userAccessLevel > ACCESS_LEVEL.ADMIN) throw new functions.https.HttpsError('permission-denied', 'You are not allowed to share this file');

        const user = await getUserById(context.auth.uid);
        const invitedUser = await getUserByEmail(email);

        if (!invitedUser || !user) {
            throw new functions.https.HttpsError('not-found', 'Invited user not found');
        }


        if (await isFileCollaborator(fileId, context.auth.uid, invitedUser.uid)) throw new functions.https.HttpsError('already-exists', 'User is already a collaborator on the folder');

        const db = getFirestore();
        const invitationDocRef = await db.collection('invitations').add({
            ownerId: file.ownerUid,
            type: 'file',
            accessLevel: accessLevel,
            fileId: fileId,
            invitedUserId: invitedUser.uid,
            used: false,
        });

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            secure: true,
            auth: {
                user: process.env.SENDER_EMAIL_ADDRESS || '',
                pass: process.env.SENDER_EMAIL_PASSWORD || ''
            }
        });

        const invitationURL = `${WEBSITE_URL}/accept_invitation?invitationId=${invitationDocRef.id}&type=file`;

        const mailOptions = {
            from: 'Bobox',
            to: invitedUser.email,
            subject: `${user.name} invited you to collaborate on a file`,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>File Sharing Invitation</title>
                </head>
                <body>
                    <h2>File Sharing Invitation from ${user.name ? user.name : user.email}</h2> 
                    <p>${user.name ? user.name + ` (${user.email})` : user.email} has invited you to collaborate on a file within your Bobox account.</p>
                    <p>Click the link below to accept the invitation and access the file:</p>
                    <a href="${invitationURL}">Accept Invitation</a>
                    <p>If you have any questions, feel free to reach out to ${user.name} directly.</p>
                </body>
                </html> 
            `
        };

        // Send Email
        await transporter.sendMail(mailOptions);

        return { success: true };

    } catch (error: any) {
        console.error('Error:', error.message);
        if (error instanceof functions.https.HttpsError) throw error;
        else throw new functions.https.HttpsError('internal', 'Internal Server Error', { message: error.message });
    }
});

export const shareFolderWithUserByEmail = functions.https.onCall(async (data: ShareFolderParams, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User not authenticated');
        }
        const { email, folderId, accessLevel } = data || {};
        if (!email || !folderId || !accessLevel || accessLevel < ACCESS_LEVEL.ADMIN || accessLevel > ACCESS_LEVEL.VIEWER) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid or missing parameters');
        }

        const folder = await getFolderById(context.auth.uid, folderId);
        if (!folder) throw new functions.https.HttpsError('not-found', 'Folder not found');

        const userAccessLevel: ACCESS_LEVEL = getCollaboratorAccessLevel(folder, context.auth.uid);
        if (folder.ownerUid != context.auth.uid && userAccessLevel > ACCESS_LEVEL.ADMIN) throw new functions.https.HttpsError('permission-denied', 'You are not allowed to share this folder');

        const user = await getUserById(context.auth.uid);
        const invitedUser = await getUserByEmail(email);

        if (!invitedUser || !user) {
            throw new functions.https.HttpsError('not-found', 'Invited user not found');
        }

        if (await isFolderCollaborator(folderId, context.auth.uid, invitedUser.uid)) throw new functions.https.HttpsError('already-exists', 'User is already a collaborator on the folder');

        const db = getFirestore();
        const invitationDocRef = await db.collection('invitations').add({
            ownerId: folder.ownerUid,
            type: 'folder',
            accessLevel: accessLevel,
            folderId: folderId,
            invitedUserId: invitedUser.uid,
            used: false,
        });

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            secure: true,
            auth: {
                user: process.env.SENDER_EMAIL_ADDRESS || '',
                pass: process.env.SENDER_EMAIL_PASSWORD || ''
            }
        });

        const invitationURL = `${WEBSITE_URL}/accept_invitation?invitationId=${invitationDocRef.id}&type=folder`;

        const mailOptions = {
            from: 'Bobox',
            to: invitedUser.email,
            subject: `${user.name} invited you to collaborate on a folder`, // Dynamic subject
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Folder Sharing Invitation</title>
                </head>
                <body>
                    <h2>Folder Sharing Invitation from ${user.name ? user.name : user.email}</h2> 
                    <p>${user.name ? user.name + ` (${user.email})` : user.email} has invited you to collaborate on a folder within your Bobox account.</p>
                    <p>Click the link below to accept the invitation and access the folder:</p>
                    <a href="${invitationURL}">Accept Invitation</a>
                    <p>If you have any questions, feel free to reach out to ${user.name} directly.</p>
                </body>
                </html> 
            `
        };

        // Send Email
        await transporter.sendMail(mailOptions);

        return { success: true };

    } catch (error: any) {
        console.error('Error:', error.message);
        if (error instanceof functions.https.HttpsError) throw error;
        else throw new functions.https.HttpsError('internal', 'Internal Server Error', { message: error.message });
    }
});


const isFileCollaborator = async (folderId: string, ownerId: string, userId: string) => {
    const folder = await getFileById(ownerId, folderId);

    if (!folder) return false;

    const collaboratorData = folder.collaborators?.[userId];
    if (collaboratorData) return true;

    return false;
}

export const getCollaboratorAccessLevel = (resource: any, userId: string) => {
    return resource.collaborators?.[userId] ? resource.collaborators?.[userId].accessLevel : ACCESS_LEVEL.NON_COLLABORATOR;
}

const isFolderCollaborator = async (folderId: string, ownerId: string, userId: string) => {
    const folder = await getFolderById(ownerId, folderId);

    if (!folder) return false;

    const collaboratorData = folder.collaborators?.[userId];
    if (collaboratorData) return true;

    return false;
}

const addCollaboratorToFile = async (fileId: string, ownerId: string, invitedUser: any, accessLevel: ACCESS_LEVEL) => {
    const db = getFirestore();

    const docRef = await db.collection('users').doc(ownerId).collection('files').doc(fileId);

    const docSnap = await docRef.get();
    if (docSnap.exists) {
        await docRef.update({
            [`collaborators.${invitedUser.uid}`]: {
                name: invitedUser.name,
                email: invitedUser.email,
                accessLevel: accessLevel,
            }
        });
    }

    await addSharedFileEntryToCollaborator(invitedUser.uid, fileId, docRef);
}

const addSharedFileEntryToCollaborator = async (collaboratorId: string, fileId: string, sharedFileRef: any) => {
    const db = getFirestore();
    const sharedFileDocRef = db.collection('users').doc(collaboratorId).collection('files').doc(fileId);
    await sharedFileDocRef.set({
        sharedFileRef: sharedFileRef,
        shared: true
    });
}

const deleteSharedFileEntryFromCollaborator = async (collaboratorId: string, fileId: string) => {
    const db = getFirestore();
    const sharedFileDocRef = db.collection('users').doc(collaboratorId).collection('files').doc(fileId);
    await sharedFileDocRef.delete();
};

const deleteSharedFolderEntryFromCollaborator = async (collaboratorId: string, folderId: string) => {
    const db = getFirestore();
    const sharedFileDocRef = db.collection('users').doc(collaboratorId).collection('folders').doc(folderId);
    await sharedFileDocRef.delete();
};

const addSharedFolderEntryToCollaborator = async (collaboratorId: string, folderId: string, sharedFolderRef: any) => {
    const db = getFirestore();
    const sharedFolderDocRef = db.collection('users').doc(collaboratorId).collection('folders').doc(folderId);
    await sharedFolderDocRef.set({
        sharedFolderRef: sharedFolderRef,
        shared: true
    });
}

const addCollaboratorToFolder = async (folderId: string, ownerId: string, invitedUser: any, accessLevel: ACCESS_LEVEL) => {
    const db = getFirestore();

    const docRef = await db.collection('users').doc(ownerId).collection('folders').doc(folderId);

    const docSnap = await docRef.get();
    if (docSnap.exists) {
        await docRef.update({
            [`collaborators.${invitedUser.uid}`]: {
                name: invitedUser.name,
                email: invitedUser.email,
                accessLevel: accessLevel,
            }
        });
    }

    await addSharedFolderEntryToCollaborator(invitedUser.uid, folderId, docRef);

    const files = docSnap.data()?.files ?? [];
    for (const fileId of files) {
        await addCollaboratorToFile(fileId, ownerId, invitedUser, accessLevel);
    }

    const nestedFolders = docSnap.data()?.folders ?? [];
    for (const nestedFolderId of nestedFolders) {
        await addCollaboratorToFolder(nestedFolderId, ownerId, invitedUser, accessLevel);
    }
}

export const acceptFileShareInvitation = functions.https.onCall(async (invitationId: string, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User not authenticated');
        }

        if (!invitationId) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid or missing parameters');
        }

        const db = getFirestore();

        const invitation = await getInvitationById(invitationId);

        if (!invitation) throw new functions.https.HttpsError('not-found', 'Invitation not found');

        if (invitation.type != 'file') throw new functions.https.HttpsError('invalid-argument', 'Incorrect invitation type');

        //if (invitation.used) throw new functions.https.HttpsError('invalid-argument', 'Invitation was already used');

        const invitedUser = await getUserById(invitation.invitedUserId);

        if (!invitedUser) throw new Error('Unexpected error occurred');

        if (invitedUser.uid != context.auth.uid) {
            throw new functions.https.HttpsError('permission-denied', 'You do not have permission to accept this invitation');
        }

        await addCollaboratorToFile(invitation.fileId, invitation.ownerId, invitedUser, invitation.accessLevel);

        await db.collection('invitations').doc(invitationId).delete();

        return { success: true };

    } catch (error: any) {
        console.error('Error:', error.message);
        if (error instanceof functions.https.HttpsError) throw error;
        else throw new functions.https.HttpsError('internal', 'Internal Server Error', { message: error.message });
    }
});

export const acceptFolderShareInvitation = functions.https.onCall(async (invitationId: string, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User not authenticated');
        }

        if (!invitationId) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid or missing parameters');
        }

        const db = getFirestore();

        const invitation = await getInvitationById(invitationId);

        if (!invitation) throw new functions.https.HttpsError('not-found', 'Invitation not found');

        if (invitation.type != 'folder') throw new functions.https.HttpsError('invalid-argument', 'Incorrect invitation type');

        //if (invitation.used) throw new functions.https.HttpsError('invalid-argument', 'Invitation was already used');

        const invitedUser = await getUserById(invitation.invitedUserId);

        if (!invitedUser) throw new Error('Unexpected error occurred');

        if (invitedUser.uid != context.auth.uid) {
            throw new functions.https.HttpsError('permission-denied', 'You do not have permission to accept this invitation');
        }

        await addCollaboratorToFolder(invitation.folderId, invitation.ownerId, invitedUser, invitation.accessLevel)

        await db.collection('invitations').doc(invitationId).delete();

        return { success: true };

    } catch (error: any) {
        console.error('Error:', error.message);
        if (error instanceof functions.https.HttpsError) throw error;
        else throw new functions.https.HttpsError('internal', 'Internal Server Error', { message: error.message });
    }
});

export const deleteFile = functions.https.onCall(async (fileId: string, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User not authenticated');
        }

        const file = await getFileById(context.auth.uid, fileId);
        if (!file) throw new functions.https.HttpsError('not-found', 'File not found');

        const accessLevel: ACCESS_LEVEL = getCollaboratorAccessLevel(file, context.auth.uid);
        if (file.ownerUid != context.auth.uid && accessLevel > ACCESS_LEVEL.ADMIN) throw new functions.https.HttpsError('permission-denied', 'You are not allowed to delete this file');
        await deleteFileFromCloudStorage(file.fileKey);
        await deleteFileFromDB(context.auth.uid, fileId)
        return { success: true };

    } catch (error: any) {
        console.error('Error:', error.message);
        if (error instanceof functions.https.HttpsError) throw error;
        else throw new functions.https.HttpsError('internal', 'Internal Server Error', { message: error.message });
    }
});

export const deleteFolder = functions.https.onCall(async (folderId: string, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User not authenticated');
        }

        if (!folderId) throw new functions.https.HttpsError('invalid-argument', 'Invalid or missing parameters');

        if (folderId === "root") throw new functions.https.HttpsError('permission-denied', 'Cannot delete root folder');
        if (folderId === "shared") throw new functions.https.HttpsError('permission-denied', 'Cannot delete shared folder');

        const folderRef = await getFolderRefById(context.auth.uid, folderId);
        if (!folderRef) throw new functions.https.HttpsError('not-found', 'Folder not found');
        const folder = (await folderRef.get()).data();

        const accessLevel: ACCESS_LEVEL = getCollaboratorAccessLevel(folder, context.auth.uid);
        if (folder!.ownerUid != context.auth.uid && accessLevel > ACCESS_LEVEL.ADMIN) throw new functions.https.HttpsError('permission-denied', 'You are not allowed to delete this folder');

        try {
            const fileIds = folder!.files;
            const fileKeys: string[] = [];
            if (fileIds && fileIds.length > 0) {
                for (const fileId of fileIds) {
                    const fileRef = await getFileRefById(context.auth.uid, fileId);
                    if (!fileRef) continue;
                    const file = (await fileRef.get()).data();
                    console.log("Deleting file file with key: ", file!.fileKey);
                    fileKeys.push(file!.fileKey);
                    await deleteFileFromDB(context.auth.uid, fileId)
                }

                await deleteFilesFromCloudStorage(fileKeys);
            }

            if (folder!.collaborators) {
                for (const [key] of Object.entries(folder!.collaborators)) {
                    await deleteSharedFolderEntryFromCollaborator(key, folderId);
                }
            }
            const parentFolderRef = await getFolderRefById(context.auth.uid, folder!.parentFolderId);
            if (!parentFolderRef) return;

            await parentFolderRef.update({ folders: FieldValue.arrayRemove(folderId) });

            await folderRef.delete();

            return { success: true };
        } catch {
            throw new Error('Failed to delete folder');
        }

    } catch (error: any) {
        console.error('Error:', error.message);
        if (error instanceof functions.https.HttpsError) throw error;
        else throw new functions.https.HttpsError('internal', 'Internal Server Error', { message: error.message });
    }
});