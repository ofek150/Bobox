import { CallableRequest, HttpsError, onCall } from "firebase-functions/v2/https";
import { FileEntry, LinkInfo, SharedFile, DownloadInfoParams, RenameFileParams, CreateFolderParams, MoveFileToFolderParams, RenameFolderParams, ShareFileParams, ShareFolderParams } from "./utils/types.js";
import { ACCESS_LEVEL, SEVEN_DAYS_SECONDS, WEBSITE_URL } from "./utils/constants.js";
import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";
import { deleteFileFromCloudStorage, deleteFilesFromCloudStorage, generateDownloadLink } from "./r2.js";
import * as nodemailer from 'nodemailer';
import 'dotenv/config'
import { formatFileSize, isValidEmail } from "./utils/helpers.js";
import { escapeHtml, internal, requireAccess, requireAuth, requireFields, requireName } from "./utils/guards.js";

export const getFolderById = async (uid: string, folderId: string) => {
    const db = getFirestore();

    const docRef = db.collection('users').doc(uid).collection('folders').doc(folderId);
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
    const docRef = db.collection('users').doc(uid).collection('folders').doc(folderId);
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
    const docRef = db.collection('users').doc(uid);
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

export const getWebsiteDocRef = async () => {
    const db = getFirestore();
    const docRef = db.collection('website').doc('website');
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
    if (!fileRef) throw new HttpsError('not-found', 'File not found');

    const expirationDate = new Date(linkInfo.expiresAt);
    if (Number.isNaN(expirationDate.getTime())) {
        throw new HttpsError('internal', 'The link expiration is invalid.');
    }
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
    if (!parentFolder) throw new HttpsError('not-found', 'Parent folder not found');

    const userRef = await getUserRefById(userId);
    if (!userRef) throw new HttpsError('not-found', 'User not found');

    const websiteDocRef = await getWebsiteDocRef();
    if (!websiteDocRef) throw new HttpsError('internal', 'Storage limits are not configured.');

    const websiteData = (await websiteDocRef.get()).data();
    const user = (await userRef.get()).data();
    if (!websiteData || !user) throw new HttpsError('internal', 'Storage limits are not configured.');

    if (websiteData.totalFileSize == websiteData.maxTotalFileSize) {
        throw new HttpsError(
            'resource-exhausted',
            `Website has reached the maximum total file size limit (${formatFileSize(websiteData.maxTotalFileSize)})`
        );
    }

    if (websiteData.totalFileSize + file.fileSize > websiteData.maxTotalFileSize) {
        throw new HttpsError(
            'invalid-argument',
            `Adding this file would exceed the website's maximum total file size limit (${formatFileSize(websiteData.maxTotalFileSize)})`
        );
    }

    if (user.totalFileSize == user.maxTotalFileSize) {
        throw new HttpsError(
            'resource-exhausted',
            `User has reached the maximum total file size limit (${formatFileSize(user.maxTotalFileSize)})`
        );
    }

    if (user.totalFileSize + file.fileSize > user.maxTotalFileSize) {
        throw new HttpsError(
            'invalid-argument',
            `Adding this file would exceed the user's maximum total file size limit (${formatFileSize(user.maxTotalFileSize)})`
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
            collaborators: parentFolder.collaborators ?? {},
            shared: false,
            ownerUid: parentFolder.ownerUid
        }
    );
}

export const getFileById = async (uid: string, fileId: string) => {
    const db = getFirestore();

    const docRef = db.collection('users').doc(uid).collection('files').doc(fileId);
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

    const docRef = db.collection('users').doc(uid).collection('files').doc(fileId);
    const docSnap = await docRef.get();
    let ref = docRef;
    if (create) return ref;
    if (!docSnap.exists) return null; // a ref to a missing doc used to leak out here
    const data = docSnap.data();
    if (!data) return null;
    if (data.shared && data.sharedFileRef) {
        ref = data.sharedFileRef;
        if (!(await ref.get()).exists) return null;
    }
    return ref;
}

/**
 * Marks a file as Uploaded. The status transition and the storage-quota
 * increments run in ONE transaction, so a double "complete" call (client
 * retry, double-tap) counts the bytes exactly once.
 * Returns false when the file does not exist; true also for repeats.
 */
export const setFileUploaded = async (uid: string, fileId: string, numOfParts: number) => {
    const db = getFirestore();
    const fileRef = await getFileRefById(uid, fileId);
    if (!fileRef) return false;

    const userRef = db.collection('users').doc(uid);
    const websiteDocRef = db.collection('website').doc('website');

    const outcome = await db.runTransaction(async (t) => {
        const snap = await t.get(fileRef);
        if (!snap.exists) return 'not-found' as const;
        const file = snap.data();
        if (file?.status === 'Uploaded') return 'already' as const;

        t.update(fileRef, { status: 'Uploaded', numOfParts: numOfParts });
        t.update(userRef, { totalFileSize: FieldValue.increment(file?.fileSize ?? 0) });
        t.update(websiteDocRef, { totalFileSize: FieldValue.increment(file?.fileSize ?? 0) });
        return 'transitioned' as const;
    });

    if (outcome === 'not-found') return false;

    const file = (await fileRef.get()).data();
    if (!file) throw new Error('Unexpected error occurred');

    const parentFolderRef = await getFolderRefById(uid, file.parentFolderId);
    if (!parentFolderRef) throw new Error("Parent folder not found");

    const parentFolder = (await parentFolderRef.get()).data();
    if (!parentFolder) throw new Error('Unexpected error occurred');

    await parentFolderRef.update({
        files: FieldValue.arrayUnion(fileId)
    });

    if (!parentFolder.collaborators) return true;

    for (const [key] of Object.entries(parentFolder.collaborators)) {
        await addSharedFileEntryToCollaborator(key, file.fileId, fileRef);
    }
    return true;
}

export const isUniqueFileName = async (uid: string, fileName: string, folderId: string) => {
    const db = getFirestore();
    const parentFolder = await getFolderById(uid, folderId);
    if (!parentFolder) return false;
    const filesInFolder: string[] = parentFolder.files || [];

    // Batch the lookups instead of one round-trip per file.
    const refs = filesInFolder.map((fileId) => db.collection('users').doc(uid).collection('files').doc(fileId));
    for (let i = 0; i < refs.length; i += 200) {
        const snaps = await db.getAll(...refs.slice(i, i + 200));
        for (const snap of snaps) {
            if (!snap.exists) continue;
            const file = snap.data();
            if (file?.fileName !== fileName) continue;

            if (file.status !== 'Uploaded') {
                // An abandoned upload squatting on the name: clear it out.
                await deleteFileFromDB(uid, snap.id);
                return false;
            }
            return true;
        }
    }

    return false;
}

/**
 * Deletes the file document and its collaborator mirrors. Storage quota is
 * decremented only for files that were actually uploaded (In-Progress files
 * were never added to the quota).
 */
export const deleteFileFromDB = async (uid: string, fileId: string) => {
    const db = getFirestore();
    const fileRef = await getFileRefById(uid, fileId);
    if (!fileRef) return;

    const file = (await fileRef.get()).data();
    if (!file) return;

    await db.recursiveDelete(fileRef);

    if (file.collaborators) {
        for (const [key] of Object.entries(file.collaborators)) {
            await deleteSharedFileEntryFromCollaborator(key, fileId);
        }
    }

    // Update the 'files' array in the 'folders' collection
    const folderRef = await getFolderRefById(uid, file.parentFolderId);
    if (!folderRef) return;
    await folderRef.update({ files: FieldValue.arrayRemove(fileId) });

    if (file.status !== 'Uploaded') return;

    const userRef = db.collection('users').doc(uid);
    await userRef.update({ totalFileSize: FieldValue.increment(-file.fileSize) });

    const websiteDocRef = db.collection('website').doc('website');
    await websiteDocRef.update({ totalFileSize: FieldValue.increment(-file.fileSize) });
};

export const getFileDownloadInfoFromDB = async (downloaderUid: string, ownerUid: string, fileId: string, downloadId: string) => {
    const fileRef = await getFileRefById(ownerUid, fileId);
    if (!fileRef) throw new HttpsError('not-found', 'File not found');
    const fileData = (await fileRef.get()).data();

    const linkDocRef = fileRef.collection('links').doc(downloadId);
    const linkDocSnap = await linkDocRef.get();

    if (!linkDocSnap.exists) throw new HttpsError('not-found', 'This link is no longer available.');
    const file = fileData;
    const linkInfo = linkDocSnap.data();

    if (!file || !linkInfo) throw new HttpsError('not-found', 'This link is no longer available.');

    if (!linkInfo.isPublic && downloaderUid != ownerUid && !file.collaborators?.[downloaderUid]) throw new HttpsError('permission-denied', "You are not allowed to access this file");

    let downloadLink = linkInfo.downloadLink;
    if (!linkInfo.isPermanent && linkInfo.expiresAt && linkInfo.expiresAt.toDate() < new Date()) {
        await linkDocRef.delete();
        throw new HttpsError('invalid-argument', 'Download link has expired');
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
        uploadedAt: (file.uploadedAt?.toDate() ?? new Date()).toString(),
        downloadId: linkInfo.downloadId,
        downloadLink: downloadLink,
    }

    return sharedFileInfo;
}

export const getFilePrivateDownloadIdFromDB = async (userId: string, fileId: string) => {
    const file = await getFileById(userId, fileId);

    if (!file) throw new HttpsError('not-found', 'File not found');
    return file.privateLinkDownloadId;
}

export const getFileDownloadInfo = onCall({ cors: true }, async (request: CallableRequest<DownloadInfoParams>) => {
    try {
        const { ownerUid, fileId, downloadId } = requireFields(request.data, ['ownerUid', 'fileId', 'downloadId']);
        const uid = request.auth?.uid;
        if (!uid) {
            // Public links are downloaded by anonymous visitors; private links
            // are access-checked inside getFileDownloadInfoFromDB.
            throw new HttpsError('unauthenticated', 'Please sign in to continue.');
        }

        const result = await getFileDownloadInfoFromDB(uid, ownerUid, fileId, downloadId);
        return { fileInfo: result };
    } catch (error: unknown) {
        throw internal('getFileDownloadInfo', error);
    }
});

export const renameFile = onCall({ cors: true }, async (request: CallableRequest<RenameFileParams>) => {
    const uid = requireAuth(request.auth);
    try {
        const { fileId, newFileName } = requireFields(request.data, ['fileId', 'newFileName']);
        const name = requireName(newFileName, 'file');

        const fileRef = await getFileRefById(uid, fileId);

        const file = fileRef ? (await fileRef.get()).data() : null;
        requireAccess(file ?? null, uid, ACCESS_LEVEL.OPERATOR, 'File not found');

        const oldFileName: string = file!.fileName;
        const oldFileExtension = oldFileName.includes('.') ? oldFileName.split('.').pop() : '';
        const newFileNameWithExtension = name + (oldFileExtension ? `.${oldFileExtension}` : '');

        await fileRef!.update({
            fileName: newFileNameWithExtension
        });

        return { success: true };
    } catch (error: unknown) {
        throw internal('renameFile', error);
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

    const query = db.collection('users').doc(uid).collection('folders')
        .where('parentFolderId', '==', parentFolderId)
        .where('folderName', '==', folderName)
        .limit(1);
    const folderDocs = await query.get();
    return !folderDocs.empty;
};

export const createFolder = onCall({ cors: true }, async (request: CallableRequest<CreateFolderParams>) => {
    const uid = requireAuth(request.auth);
    try {
        const { folderName, parentFolderId } = requireFields(request.data, ['folderName', 'parentFolderId']);
        const name = requireName(folderName, 'folder');

        if (parentFolderId === 'shared') throw new HttpsError('permission-denied', 'You are not allowed to create folders here');

        const parentFolderRef = await getFolderRefById(uid, parentFolderId);
        if (!parentFolderRef) throw new HttpsError('not-found', 'Parent folder does not exist');
        const parentFolder = (await parentFolderRef.get()).data();
        if (!parentFolder) throw new Error('Unknown error occurred');

        requireAccess(parentFolder, uid, ACCESS_LEVEL.ADMIN, 'Parent folder does not exist');

        const db = getFirestore();

        if (await doesFolderNameExistInFolder(uid, parentFolderId, name)) throw new HttpsError('already-exists', 'A folder with the same name already exists in this folder.');

        const collaborators: Record<string, unknown> = parentFolder.collaborators ?? {};

        const folderDocRef = db.collection('users').doc(parentFolder.ownerUid).collection("folders").doc();
        await folderDocRef.set({
            parentFolderId: parentFolderId,
            folderName: name,
            createdAt: FieldValue.serverTimestamp(),
            files: [],
            folders: [],
            collaborators: collaborators,
            shared: false,
            ownerUid: parentFolder.ownerUid
        });

        // Awaited (a floating promise used to desync the parent's folder list).
        await parentFolderRef.update({
            folders: FieldValue.arrayUnion(folderDocRef.id)
        });

        for (const key of Object.keys(collaborators)) {
            await addSharedFolderEntryToCollaborator(key, folderDocRef.id, folderDocRef);
        }

        return { success: true };
    } catch (error: unknown) {
        throw internal('createFolder', error);
    }

});

export const moveFileToFolder = onCall({ cors: true }, async (request: CallableRequest<MoveFileToFolderParams>) => {
    const uid = requireAuth(request.auth);
    try {
        const { fileId, currentFolderId, newFolderId } = requireFields(request.data, ['fileId', 'currentFolderId', 'newFolderId']);

        if (currentFolderId === newFolderId) throw new HttpsError('already-exists', 'File already exists in that folder');
        if (newFolderId === "shared") throw new HttpsError('permission-denied', 'You are not allowed to move files here');

        const fileRef = await getFileRefById(uid, fileId);
        if (!fileRef) throw new HttpsError('not-found', 'File not found');

        const fileData = (await fileRef.get()).data();
        if (uid != fileData?.ownerUid) throw new HttpsError('permission-denied', 'Only the owner can move this file');

        // The destination folder must exist and the mover must be allowed to
        // place files in it (same rule as uploads).
        const newFolderRef = await getFolderRefById(uid, newFolderId);
        if (!newFolderRef) throw new HttpsError('not-found', 'New folder not found');
        const newFolderData = (await newFolderRef.get()).data();
        requireAccess(newFolderData ?? null, uid, ACCESS_LEVEL.ADMIN, 'New folder not found');

        // No name collisions in the destination.
        if (await isUniqueFileName(uid, fileData.fileName, newFolderId)) {
            throw new HttpsError('already-exists', 'A file with the same name already exists in the destination folder.');
        }

        // Check if the file exists in the current folder
        const currFolderId = currentFolderId === "shared" ? "root" : currentFolderId
        const currentFolderRef = await getFolderRefById(uid, currFolderId);
        if (!currentFolderRef) throw new HttpsError('not-found', 'Current folder not found');

        const currentFolderData = (await currentFolderRef.get()).data();
        const currentFilesArray: string[] = currentFolderData?.files || [];

        if (!currentFilesArray.includes(fileId)) {
            throw new HttpsError('failed-precondition', "File not found in the current folder");
        }

        // All three moves in one transaction: the file never vanishes from
        // both folders on a partial failure.
        const db = getFirestore();
        await db.runTransaction(async (t) => {
            t.update(currentFolderRef, { files: FieldValue.arrayRemove(fileId) });
            t.update(newFolderRef, { files: FieldValue.arrayUnion(fileId) });
            t.update(fileRef, { parentFolderId: newFolderId });
        });

        return { success: true };
    } catch (error: unknown) {
        throw internal('moveFileToFolder', error);
    }
});

export const renameFolder = onCall({ cors: true }, async (request: CallableRequest<RenameFolderParams>) => {
    const uid = requireAuth(request.auth);
    try {
        const { folderId, newFolderName } = requireFields(request.data, ['folderId', 'newFolderName']);
        const name = requireName(newFolderName, 'folder');

        if (folderId === "root") throw new HttpsError('permission-denied', 'Cannot rename root folder');
        if (folderId === "shared") throw new HttpsError('permission-denied', 'Cannot rename shared folder');

        const folderRef = await getFolderRefById(uid, folderId);
        if (!folderRef) {
            throw new HttpsError('not-found', 'Folder not found');
        }
        const folder = (await folderRef.get()).data();
        requireAccess(folder ?? null, uid, ACCESS_LEVEL.OPERATOR, 'Folder not found');

        await folderRef.update({
            'folderName': name
        });
        return { success: true };

    } catch (error: unknown) {
        throw internal('renameFolder', error);
    }
});

const getUserByEmail = async (email: string) => {
    const db = getFirestore();
    try {
        const querySnapshot = await db.collection('users').where('email', '==', email).limit(1).get();

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

interface UserBasic {
    uid: string;
    name?: string;
    email?: string;
}

const getUserById = async (userId: string): Promise<UserBasic | null> => {
    const db = getFirestore();
    try {
        const documentSnapshot = await db.collection('users').doc(userId).get();

        if (!documentSnapshot.exists) return null;
        else {
            const user = documentSnapshot.data();
            if (!user || typeof user.uid !== 'string') return null;
            return user as UserBasic;
        }
    } catch (error) {
        console.error('Error getting user by ID:', error);
        throw error;
    }
};

const getTransporter = () => nodemailer.createTransport({
    service: 'gmail',
    secure: true,
    auth: {
        user: process.env.SENDER_EMAIL_ADDRESS || '',
        pass: process.env.SENDER_EMAIL_PASSWORD || ''
    }
});

/** One invitation email template for files and folders, HTML-escaped. */
const sendInvitationEmail = async (kind: 'file' | 'folder', fromUser: { name?: string; email?: string }, invitedEmail: string, invitationId: string) => {
    const senderLabel = escapeHtml(fromUser.name ? `${fromUser.name} (${fromUser.email})` : (fromUser.email ?? 'someone'));
    const senderShort = escapeHtml(fromUser.name || fromUser.email || 'someone');
    const invitationURL = `${WEBSITE_URL}/accept_invitation?invitationId=${encodeURIComponent(invitationId)}&type=${kind}`;

    await getTransporter().sendMail({
        from: 'Bobox',
        to: invitedEmail,
        subject: `${senderShort} invited you to collaborate on a ${kind}`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <title>${kind === 'file' ? 'File' : 'Folder'} Sharing Invitation</title>
            </head>
            <body>
                <h2>${kind === 'file' ? 'File' : 'Folder'} Sharing Invitation from ${senderShort}</h2>
                <p>${senderLabel} has invited you to collaborate on a ${kind} within your Bobox account.</p>
                <p>Click the link below to accept the invitation and access the ${kind}:</p>
                <a href="${invitationURL}">Accept Invitation</a>
                <p>This invitation expires after 7 days.</p>
                <p>If you have any questions, feel free to reach out to ${senderShort} directly.</p>
            </body>
            </html>
        `
    });
};

const shareWith = async (kind: 'file' | 'folder', uid: string, data: Record<string, any>, resource: Record<string, any> | null, resourceId: string) => {
    const { email, accessLevel } = data;
    if (!isValidEmail(email)) throw new HttpsError('invalid-argument', 'The email address is invalid.');
    if (typeof accessLevel !== 'number' || accessLevel < ACCESS_LEVEL.ADMIN || accessLevel > ACCESS_LEVEL.VIEWER) {
        throw new HttpsError('invalid-argument', 'Invalid or missing parameters');
    }

    requireAccess(resource, uid, ACCESS_LEVEL.ADMIN, kind === 'file' ? 'File not found' : 'Folder not found');

    if (resource!.ownerUid === uid && email.toLowerCase() === (resource!.ownerEmail ?? '').toLowerCase()) {
        throw new HttpsError('invalid-argument', "You can't invite yourself.");
    }

    const user = await getUserById(uid);
    const invitedUser = await getUserByEmail(email);

    if (!invitedUser || !user) {
        throw new HttpsError('not-found', 'Invited user not found');
    }

    if (invitedUser.uid === uid) throw new HttpsError('invalid-argument', "You're already the owner.");

    const alreadyCollaborator = kind === 'file'
        ? await isFileCollaborator(resourceId, resource!.ownerUid!, invitedUser.uid)
        : await isFolderCollaborator(resourceId, resource!.ownerUid!, invitedUser.uid);
    if (alreadyCollaborator) throw new HttpsError('already-exists', 'User is already a collaborator on this item');

    const db = getFirestore();
    const invitationDocRef = db.collection('invitations').doc();
    await invitationDocRef.set({
        ownerId: resource!.ownerUid,
        type: kind,
        accessLevel: accessLevel,
        [kind === 'file' ? 'fileId' : 'folderId']: resourceId,
        invitedUserId: invitedUser.uid,
        used: false,
        createdAt: FieldValue.serverTimestamp(),
    });

    try {
        await sendInvitationEmail(kind, user, invitedUser.email, invitationDocRef.id);
    } catch (error) {
        // No email → no orphaned invitation.
        await invitationDocRef.delete();
        throw error;
    }

    return { success: true };
};

export const shareFileWithUserByEmail = onCall({ cors: true }, async (request: CallableRequest<ShareFileParams>) => {
    const uid = requireAuth(request.auth);
    try {
        const data = requireFields(request.data, ['email', 'fileId', 'accessLevel']);
        const file = await getFileById(uid, data.fileId);

        return await shareWith('file', uid, data, file ?? null, data.fileId);
    } catch (error: unknown) {
        throw internal('shareFileWithUserByEmail', error);
    }
});

export const shareFolderWithUserByEmail = onCall({ cors: true }, async (request: CallableRequest<ShareFolderParams>) => {
    const uid = requireAuth(request.auth);
    try {
        const data = requireFields(request.data, ['email', 'folderId', 'accessLevel']);
        const folder = await getFolderById(uid, data.folderId);

        return await shareWith('folder', uid, data, folder ?? null, data.folderId);
    } catch (error: unknown) {
        throw internal('shareFolderWithUserByEmail', error);
    }
});


const isFileCollaborator = async (fileId: string, ownerId: string, userId: string) => {
    const file = await getFileById(ownerId, fileId);

    if (!file) return false;

    const collaboratorData = file.collaborators?.[userId];
    if (collaboratorData) return true;

    return false;
}

export const getCollaboratorAccessLevel = (resource: { collaborators?: Record<string, { accessLevel: number }> } | null | undefined, userId: string) => {
    return resource?.collaborators?.[userId]?.accessLevel ?? ACCESS_LEVEL.NON_COLLABORATOR;
}

const isFolderCollaborator = async (folderId: string, ownerId: string, userId: string) => {
    const folder = await getFolderById(ownerId, folderId);

    if (!folder) return false;

    const collaboratorData = folder.collaborators?.[userId];
    if (collaboratorData) return true;

    return false;
}

const addCollaboratorToFile = async (fileId: string, ownerId: string, invitedUser: { uid: string; name?: string; email?: string }, accessLevel: ACCESS_LEVEL) => {
    const db = getFirestore();

    const docRef = db.collection('users').doc(ownerId).collection('files').doc(fileId);

    const docSnap = await docRef.get();
    if (!docSnap.exists) return; // source gone: never create a dangling mirror

    await docRef.update({
        [`collaborators.${invitedUser.uid}`]: {
            name: invitedUser.name,
            email: invitedUser.email,
            accessLevel: accessLevel,
        }
    });

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

const addCollaboratorToFolder = async (folderId: string, ownerId: string, invitedUser: { uid: string; name?: string; email?: string }, accessLevel: ACCESS_LEVEL, visited: Set<string> = new Set()) => {
    if (visited.has(folderId)) return; // data-hygiene cycles must not recurse forever
    visited.add(folderId);

    const db = getFirestore();

    const docRef = db.collection('users').doc(ownerId).collection('folders').doc(folderId);

    const docSnap = await docRef.get();
    if (!docSnap.exists) return;

    await docRef.update({
        [`collaborators.${invitedUser.uid}`]: {
            name: invitedUser.name,
            email: invitedUser.email,
            accessLevel: accessLevel,
        }
    });

    await addSharedFolderEntryToCollaborator(invitedUser.uid, folderId, docRef);

    const files = docSnap.data()?.files ?? [];
    for (const fileId of files) {
        await addCollaboratorToFile(fileId, ownerId, invitedUser, accessLevel);
    }

    const nestedFolders = docSnap.data()?.folders ?? [];
    for (const nestedFolderId of nestedFolders) {
        await addCollaboratorToFolder(nestedFolderId, ownerId, invitedUser, accessLevel, visited);
    }
}

/**
 * Consumes an invitation transactionally: a double-tap (or React StrictMode
 * double-effect) second call gets "already used" instead of a duplicate
 * fan-out.
 */
const claimInvitation = async (invitationId: string, kind: 'file' | 'folder', uid: string) => {
    const db = getFirestore();
    const invitationRef = db.collection('invitations').doc(invitationId);

    const invitation = await db.runTransaction(async (t) => {
        const snap = await t.get(invitationRef);
        if (!snap.exists) throw new HttpsError('not-found', 'Invitation not found');
        const data = snap.data()!;

        if (data.used) throw new HttpsError('failed-precondition', 'This invitation has already been used');
        if (data.type !== kind) throw new HttpsError('invalid-argument', 'Incorrect invitation type');

        // Invitations expire after 7 days.
        const createdAt = data.createdAt?.toDate?.();
        if (createdAt && Date.now() - createdAt.getTime() > SEVEN_DAYS_SECONDS * 1000) {
            throw new HttpsError('permission-denied', 'This invitation has expired');
        }

        t.update(invitationRef, { used: true });
        return data;
    });

    if (invitation.invitedUserId !== uid) {
        throw new HttpsError('permission-denied', 'You do not have permission to accept this invitation');
    }

    return invitation;
};

export const acceptFileShareInvitation = onCall({ cors: true }, async (request: CallableRequest<string>) => {
    const uid = requireAuth(request.auth);
    try {
        if (!request.data) throw new HttpsError('invalid-argument', 'Invalid or missing parameters');

        const invitation = await claimInvitation(request.data, 'file', uid);

        const invitedUser = await getUserById(invitation.invitedUserId);
        if (!invitedUser) throw new HttpsError('internal', 'Please sign in and try again.');

        await addCollaboratorToFile(invitation.fileId, invitation.ownerId, invitedUser, invitation.accessLevel);

        await getFirestore().collection('invitations').doc(request.data).delete();

        return { success: true };

    } catch (error: unknown) {
        throw internal('acceptFileShareInvitation', error);
    }
});

export const acceptFolderShareInvitation = onCall({ cors: true }, async (request: CallableRequest<string>) => {
    const uid = requireAuth(request.auth);
    try {
        if (!request.data) throw new HttpsError('invalid-argument', 'Invalid or missing parameters');

        const invitation = await claimInvitation(request.data, 'folder', uid);

        const invitedUser = await getUserById(invitation.invitedUserId);
        if (!invitedUser) throw new HttpsError('internal', 'Please sign in and try again.');

        await addCollaboratorToFolder(invitation.folderId, invitation.ownerId, invitedUser, invitation.accessLevel);

        await getFirestore().collection('invitations').doc(request.data).delete();

        return { success: true };

    } catch (error: unknown) {
        throw internal('acceptFolderShareInvitation', error);
    }
});

export const deleteFile = onCall({ cors: true }, async (request: CallableRequest<string>) => {
    const uid = requireAuth(request.auth);
    try {
        if (!request.data) throw new HttpsError('invalid-argument', 'Invalid or missing parameters');
        const fileId = request.data;

        const file = await getFileById(uid, fileId);
        requireAccess(file ?? null, uid, ACCESS_LEVEL.ADMIN, 'File not found');

        // Storage first, metadata second: a leftover doc pointing at deleted
        // bytes is worse than a stale object, and the R2 delete is idempotent.
        if (file!.status === 'Uploaded') {
            await deleteFileFromCloudStorage(file!.fileKey);
        }
        await deleteFileFromDB(uid, fileId)
        return { success: true };

    } catch (error: unknown) {
        throw internal('deleteFile', error);
    }
});

export const deleteFolder = onCall({ cors: true }, async (request: CallableRequest<string>) => {
    const uid = requireAuth(request.auth);
    try {
        if (!request.data) throw new HttpsError('invalid-argument', 'Invalid or missing parameters');
        const folderId = request.data;

        if (folderId === "root") throw new HttpsError('permission-denied', 'Cannot delete root folder');
        if (folderId === "shared") throw new HttpsError('permission-denied', 'Cannot delete shared folder');

        const folderRef = await getFolderRefById(uid, folderId);
        if (!folderRef) throw new HttpsError('not-found', 'Folder not found');
        const folder = (await folderRef.get()).data();
        requireAccess(folder ?? null, uid, ACCESS_LEVEL.ADMIN, 'Folder not found');

        // Walk the whole subtree (used to stop one level deep and orphan
        // nested folders, their files, and their storage).
        const visited = new Set<string>([folderId]);
        const folderRefs: Array<{ id: string; ref: any; data: Record<string, any> }> = [{ id: folderId, ref: folderRef, data: folder! }];
        const fileIds: string[] = [];

        for (let i = 0; i < folderRefs.length; i++) {
            const current = folderRefs[i];
            fileIds.push(...(current.data.files ?? []));
            for (const childId of (current.data.folders ?? []) as string[]) {
                if (visited.has(childId)) continue;
                visited.add(childId);
                const childRef = await getFolderRefById(uid, childId);
                if (!childRef) continue;
                const childData = (await childRef.get()).data();
                if (!childData) continue;
                folderRefs.push({ id: childId, ref: childRef, data: childData });
            }
        }

        // R2 objects first, then Firestore: chunks of ≤1000 keys.
        const fileKeys: string[] = [];
        for (const fileId of fileIds) {
            const f = await getFileById(uid, fileId);
            if (f && f.status === 'Uploaded') fileKeys.push(f.fileKey);
        }
        if (fileKeys.length > 0) {
            await deleteFilesFromCloudStorage(fileKeys);
        }

        for (const fileId of fileIds) {
            await deleteFileFromDB(uid, fileId);
        }

        for (const { id: fId, data: fData } of folderRefs) {
            if (fData.collaborators) {
                for (const key of Object.keys(fData.collaborators)) {
                    await deleteSharedFolderEntryFromCollaborator(key, fId);
                }
            }
        }

        const parentFolderRef = await getFolderRefById(uid, folder!.parentFolderId);
        if (parentFolderRef) {
            await parentFolderRef.update({ folders: FieldValue.arrayRemove(folderId) });
        }

        for (const { ref } of folderRefs) {
            await ref.delete();
        }

        return { success: true };

    } catch (error: unknown) {
        throw internal('deleteFolder', error);
    }
});
