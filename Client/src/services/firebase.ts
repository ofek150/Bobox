import { initializeApp } from "firebase/app";
import { GoogleAuthProvider, connectAuthEmulator, getAuth, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup, signOut } from "firebase/auth";
import { connectFirestoreEmulator, onSnapshot, doc, getDoc, getFirestore, collection, getDocs } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions, httpsCallable } from "firebase/functions";
import { toast } from "sonner";
import { isValidEmail, isValidName, isValidPassword } from "../utils/validations";
import { formatDateToDDMMYYYY } from "../utils/helpers";
import { toFriendlyMessage } from "../utils/errors";
import { File, Folder, AbortMultiPartUploadParams, CompleteMultiPartParams, UploadFileParams, UploadPartParams, DownloadInfoParams, GenerateDownloadLinkParams, RenameFileParams, CreateFolderParams, MoveFileToFolderParams, RenameFolderParams, ShareFolderParams, ShareFileParams } from "../utils/types";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: import.meta.env.VITE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_APP_ID,
  measurementId: import.meta.env.VITE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
const functions = getFunctions(app);

// Emulators are opt-in: set VITE_USE_FIREBASE_EMULATORS=1 to talk to the local
// Firebase suite (run `firebase emulators:start` from Server/) instead of the real project.
const USE_FIREBASE_EMULATORS = import.meta.env.VITE_USE_FIREBASE_EMULATORS === "1";

if (USE_FIREBASE_EMULATORS) {
  connectFirestoreEmulator(db, "localhost", 8080);
  connectFunctionsEmulator(functions, "localhost", 5001);
  connectAuthEmulator(auth, "http://localhost:9099");
}

const googleProvider = new GoogleAuthProvider();

/**
 * Calls a callable and normalizes the outcome: on success its `data`, on
 * failure an `{ error }` string mapped through toFriendlyMessage. Components
 * check `result.error` — callables from this module never throw.
 */
async function call<T = Record<string, any>>(name: string, data?: unknown): Promise<T & { error?: string }> {
  try {
    const result = await httpsCallable(functions, name)(data);
    return result.data as unknown as T & { error?: string };
  } catch (err) {
    console.error(`[callable:${name}]`, err);
    return { error: toFriendlyMessage(err) } as T & { error: string };
  }
}

/**
 * Resolves true once the user's root folder exists (Google sign-up finishes
 * initializing in the background). Resolves false after `timeoutMs` so the
 * caller can show an escape hatch instead of an endless spinner.
 */
export const waitForRoot = async (timeoutMs: number = 15000) => {
  const uid = auth.currentUser?.uid;
  if (!uid) return false;
  const foldersRef = doc(db, `users/${uid}/folders/root`);

  return new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (value: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      unsubscribe();
      resolve(value);
    };
    const unsubscribe = onSnapshot(
      foldersRef,
      (docSnapshot) => { if (docSnapshot.exists()) finish(true); },
      () => finish(false)
    );
    const timer = setTimeout(() => finish(false), timeoutMs);
  });
};

export const signInWithGoogle = async () => {
  await signInWithPopup(auth, googleProvider);
  // The user document + root folder are initialized by a callable (v2 functions
  // have no auth triggers). Idempotent, and RequireAuth waits for the root doc.
  const { error } = await call("completeGoogleSignUp");
  if (error) {
    // The user IS signed in; setup will be retried on the next app load, and
    // RequireAuth shows a friendly waiting screen meanwhile.
    toast("Setting up your account is taking longer than usual. It will finish automatically.", { id: "google-signup-setup" });
  }
};

export const loginWithEmailAndPassword = async (email: string, password: string) => {
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    throw new Error(toFriendlyMessage(err, "Incorrect email or password."));
  }
};

export const registerWithEmailAndPassword = async (name: string, email: string, password: string, agreeMailPromotions: boolean) => {

  if (!isValidEmail(email)) {
    throw new Error("Invalid email format. Please provide a valid email address.");
  }

  if (!isValidName(name)) {
    throw new Error("Invalid name format. Name must contain at least 2 characters and consist of letters and spaces only.");
  }
  if (!isValidPassword(password)) {
    throw new Error([
      "Your password must meet the following requirements:",
      "* Must be at least 8 characters long",
      "* Must include at least two of the following:",
      "  - Uppercase letter",
      "  - Lowercase letter",
      "  - Number",
      "  - Special character such as @, $, or !"
    ].join("\n"));
  }

  const result = await call("registerWithEmailAndPassword", { name, email, password, agreeMailPromotions });
  if (result.error) throw new Error(result.error);
};

export const sendPasswordReset = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (err) {
    throw new Error(toFriendlyMessage(err, "Failed to send the reset email. Please try again."));
  }
};

export const logout = () => {
  signOut(auth);
};

export const getUserData = async (uid: string) => {
  try {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return userSnap.data();
    } else {
      return null;
    }
  } catch (err) {
    return null;
  }
};

export const initiateSmallFileUpload = async (parameters: UploadFileParams) =>
  call("initiateSmallFileUpload", parameters);

export const completeSmallFileUpload = async (fileId: string) =>
  call("completeSmallFileUpload", fileId);

export const initiateMultipartUpload = async (parameters: UploadFileParams) =>
  call("initiateMultipartUpload", parameters);

export const generateUploadPartURL = async (parameters: UploadPartParams) =>
  call("generateUploadPartURL", parameters);

export const completeMultipartUpload = async (parameters: CompleteMultiPartParams) =>
  call("completeMultipartUpload", parameters);

export const abortMultipartUpload = async (parameters: AbortMultiPartUploadParams) =>
  call("abortMultipartUpload", parameters);

export const getFileInfo = async (parameters: DownloadInfoParams) =>
  call("getFileDownloadInfo", parameters);

export const generatePublicDownloadLink = async (parameters: GenerateDownloadLinkParams) =>
  call("generatePublicDownloadLink", parameters);

interface FilesResult {
  folders: Folder[];
  files: File[];
  error?: string;
}

const getAllFilesOfUserFromDB = async (userId: string): Promise<FilesResult> => {
  try {
    const filesCollectionRef = collection(db, `users/${userId}/files`);
    const foldersCollectionRef = collection(db, `users/${userId}/folders`);

    const [filesSnapshot, foldersSnapshot] = await Promise.all([
      getDocs(filesCollectionRef),
      getDocs(foldersCollectionRef)
    ]);

    if (foldersSnapshot.empty) {
      return { files: [], folders: [] };
    }

    const sharedFilesIds: string[] = [];
    const sharedFoldersIds: string[] = [];

    const filesDataPromises: Promise<File | null | undefined>[] = filesSnapshot.docs.map(async (doc) => {
      let data: any = doc.data();
      if (data) {
        const shared = data.shared;
        if (!shared && data.status != 'Uploaded') return null;
        if (shared) {
          const docRef = data.sharedFileRef;
          if (!docRef) return null;
          const sharedFileDoc = await getDoc(docRef);
          data = sharedFileDoc.data();
          if (!data || data.status != 'Uploaded') return null;
        }
        if (!data.uploadedAt) return null; // half-written doc: skip it, do not crash the page
        const uploadedAtDate = data.uploadedAt.toDate();
        const file: File = {
          fileId: doc.id,
          fileName: data.fileName,
          fileType: data.fileType,
          fileSize: data.fileSize,
          uploadedAt: formatDateToDDMMYYYY(uploadedAtDate),
          parentFolderId: data.parentFolderId,
          shared: shared,
          ownerUid: data.ownerUid,
          privateLinkDownloadId: data.privateLinkDownloadId
        };
        if (shared) sharedFilesIds.push(file.fileId);
        return file;
      }
      return undefined;
    });

    const foldersDataPromises: Promise<Folder | null | undefined>[] = foldersSnapshot.docs.map(async (doc) => {
      let data: any = doc.data();
      if (data) {
        const shared = data.shared;
        if (shared) {
          const docRef = data.sharedFolderRef;
          if (!docRef) return null;
          const sharedFolderDoc = await getDoc(docRef);
          data = sharedFolderDoc.data();
          if (!data) return null;
        }
        const createdAtDate = data.createdAt?.toDate();
        const folder: Folder = {
          folderId: doc.id,
          folderName: data.folderName,
          parentFolderId: data.parentFolderId,
          createdAt: createdAtDate ? formatDateToDDMMYYYY(createdAtDate) : null,
          files: data.files ?? [],
          folders: data.folders ?? [],
          collaborators: data.collaborators,
          shared: shared,
          ownerUid: data.ownerUid
        };
        if (shared) sharedFoldersIds.push(folder.folderId);
        return folder;
      }
      return undefined;
    });

    const [filesData, foldersData] = await Promise.all([Promise.all(filesDataPromises), Promise.all(foldersDataPromises)]);

    const sharedFolder: Folder = {
      folderId: "shared",
      folderName: "shared",
      parentFolderId: "",
      files: sharedFilesIds,
      folders: sharedFoldersIds,
      createdAt: null,
      collaborators: {},
      shared: true,
      ownerUid: userId
    };
    foldersData.push(sharedFolder);

    const result = { folders: foldersData.filter((folder) => folder !== null && folder !== undefined) as Folder[], files: filesData.filter((file) => file !== null && file !== undefined) as File[] };
    return result;
  } catch (error) {
    console.error('Error getting documents', error);
    return { folders: [], files: [], error: "Could not load your files. Check your connection and try again." };
  }
};

export const getAllFilesOfUser = async (): Promise<FilesResult> => {
  if (!auth.currentUser?.uid) return { folders: [], files: [], error: "Your session has expired. Please sign in again." };
  return getAllFilesOfUserFromDB(auth.currentUser.uid);
}

export const renameFile = async (parameters: RenameFileParams) =>
  call("renameFile", parameters);

export const deleteFile = async (fileId: string) =>
  call("deleteFile", fileId);

export const deleteFolder = async (folderId: string) =>
  call("deleteFolder", folderId);

export const createFolder = async (parameters: CreateFolderParams) =>
  call("createFolder", parameters);

export const moveFileToFolder = async (parameters: MoveFileToFolderParams) =>
  call("moveFileToFolder", parameters);

export const renameFolder = async (parameters: RenameFolderParams) =>
  call("renameFolder", parameters);

export const shareFileWithUserByEmail = async (parameters: ShareFileParams) =>
  call("shareFileWithUserByEmail", parameters);

export const acceptFileShareInvitation = async (invitationId: string) =>
  call("acceptFileShareInvitation", invitationId);

export const shareFolderWithUserByEmail = async (parameters: ShareFolderParams) =>
  call("shareFolderWithUserByEmail", parameters);

export const acceptFolderShareInvitation = async (invitationId: string) =>
  call("acceptFolderShareInvitation", invitationId);
