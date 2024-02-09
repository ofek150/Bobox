import { initializeApp } from "firebase/app";
import { GoogleAuthProvider, connectAuthEmulator, getAuth, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup, signOut } from "firebase/auth";
import { connectFirestoreEmulator, onSnapshot, doc, getDoc, getFirestore, collection, getDocs } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions, httpsCallable } from "firebase/functions";
//import { getAnalytics } from "firebase/analytics";
import { isValidEmail, isValidName, isValidPassword } from "../utils/validations";
import { formatDateToDDMMYYYY } from "../utils/helpers";
import { File, Folder, AbortMultiPartUploadParams, CompleteMultiPartParams, UploadFileParams, UploadPartParams, DownloadInfoParams, GenerateDownloadLinkParams, RenameFileParams, CreateFolderParams, MoveFileToFolderParams, RenameFolderParams } from "../utils/types";
//import useAbortUploadData from "../hooks/useAbortUploadData";

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
//const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);
const functions = getFunctions(app);


if (process.env.NODE_ENV === 'development') {
  connectFirestoreEmulator(db, "localhost", 8080);
  connectFunctionsEmulator(functions, "localhost", 5001);
  connectAuthEmulator(auth, "http://localhost:9099");
}

const googleProvider = new GoogleAuthProvider();


export const waitForRoot = async () => {
  const foldersRef = doc(db, `users/${auth.currentUser?.uid}/folders/root`);

  return new Promise((resolve) => {
    const unsubscribe = onSnapshot(foldersRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        unsubscribe();
        resolve(true);
      }
    });
  });
}


export const signInWithGoogle = async () => {
  await signInWithPopup(auth, googleProvider);

};

export const loginWithEmailAndPassword = async (email: string, password: string) => {
  await signInWithEmailAndPassword(auth, email, password);
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


  const registerUser = httpsCallable(functions, "registerWithEmailAndPassword");
  await registerUser({ name, email, password: password, agreeMailPromotions: agreeMailPromotions });
};

export const sendPasswordReset = async (email: string) => {
  await sendPasswordResetEmail(auth, email);
};

export const logout = () => {
  signOut(auth);
};

export const getUserData = async (uid: string) => {
  try {
    console.log("Getting data of user with uid ", uid);
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

export const initiateSmallFileUpload = async (parameters: UploadFileParams) => {
  try {
    const initiateSmallFileUpload = httpsCallable(functions, "initiateSmallFileUpload");
    console.log("Parameters: ", parameters);
    const result: any = (await initiateSmallFileUpload(parameters)).data;
    return result;
  } catch (error: any) {
    console.error(error);
    return { error: error.message };
  }
};

export const completeSmallFileUpload = async (fileId: string) => {
  try {
    const completeSmallFileUpload = httpsCallable(functions, "completeSmallFileUpload");
    console.log("Parameters: ", fileId);
    const result: any = (await completeSmallFileUpload(fileId)).data
    return result;
  } catch (error: any) {
    console.error(error);
    return { error: error.message };
  }
};

export const initiateMultipartUpload = async (parameters: UploadFileParams) => {
  try {
    const initiateMultipartUpload = httpsCallable(functions, "initiateMultipartUpload");
    console.log("Parameters: ", parameters);
    const result: any = (await initiateMultipartUpload(parameters)).data;
    console.log("Result: ", result);
    return result;
  } catch (error: any) {
    console.error(error);
    return { error: error.message };
  }
};

export const generateUploadPartURL = async (parameters: UploadPartParams) => {
  try {
    const generateUploadPartURL = httpsCallable(functions, "generateUploadPartURL");
    console.log("Parameters: ", parameters);
    const result: any = (await generateUploadPartURL(parameters)).data;
    return result;
  } catch (error: any) {
    console.error(error);
    return { error: error.message };
  }
};

export const completeMultipartUpload = async (parameters: CompleteMultiPartParams) => {
  try {
    const completeMultipartUpload = httpsCallable(functions, "completeMultipartUpload");
    console.log("Parameters: ", parameters);
    const result: any = (await completeMultipartUpload(parameters)).data;
    return result;
  } catch (error: any) {
    console.error(error);
    return { error: error.message };
  }
};

export const abortMultipartUpload = async (parameters: AbortMultiPartUploadParams) => {
  try {
    console.log("Trying to abort");
    const abortMultipartUpload = httpsCallable(functions, "abortMultipartUpload");
    console.log("Parameters: ", parameters);
    const result: any = (await abortMultipartUpload(parameters)).data;
    return result;
  } catch (error: any) {
    console.error(error);
    return { error: error.message };
  }
};
export const getFileInfo = async (parameters: DownloadInfoParams) => {
  try {
    console.log("Trying to get file information");
    const getFileInfo = httpsCallable(functions, "getFileDownloadInfo");
    console.log("Parameters: ", parameters);
    const result: any = (await getFileInfo(parameters)).data;
    return result;
  } catch (error: any) {
    console.error(error);
    return { error: error.message };
  }
}
export const generatePublicDownloadLink = async (parameters: GenerateDownloadLinkParams) => {
  try {
    console.log("Generating download link for file");
    const generatePublicDownloadLink = httpsCallable(functions, "generatePublicDownloadLink");
    console.log("Parameters: ", parameters);
    const result: any = (await generatePublicDownloadLink(parameters)).data;
    console.log(result)
    return result;
  } catch (error: any) {
    console.error(error);
    return { error: error.message };
  }
}

export const generatePrivateDownloadLink = async (fileId: string) => {
  try {
    console.log("Generating download link for file");
    const generatePrivateDownloadLink = httpsCallable(functions, "generatePrivateDownloadLink");
    const result: any = (await generatePrivateDownloadLink(fileId)).data;
    console.log(result)
    return result;
  } catch (error: any) {
    console.error(error);
    return { error: error.message };
  }
}

export const getPrivateDownloadId = async (fileId: string) => {
  try {
    const getPrivateDownloadId = httpsCallable(functions, "getPrivateDownloadId");
    const result: any = (await getPrivateDownloadId(fileId)).data;
    console.log(result)
    return result;
  } catch (error: any) {
    console.error(error);
    return { error: error.message };
  }
}

const getAllFilesOfUserFromDB = async (userId: string) => {
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

    const filesData: File[] = [];
    filesSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data && data.status === 'Uploaded') {
        const uploadedAtDate = data.uploadedAt.toDate();
        const file = {
          fileId: doc.id,
          fileName: data.fileName,
          fileType: data.fileType,
          fileSize: data.fileSize,
          uploadedAt: formatDateToDDMMYYYY(uploadedAtDate),
          folderId: data.folderId
        };
        filesData.push(file);
      }
    });

    const foldersData: Folder[] = [];
    foldersSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data) {
        let createdAtDate = null;
        if (data.createdAt) {
          createdAtDate = data.createdAt.toDate();
        }
        const folder = {
          folderId: doc.id,
          folderName: data.folderName,
          inFolder: data.inFolder,
          createdAt: createdAtDate ? formatDateToDDMMYYYY(createdAtDate) : null,  // Adjust date formatting as needed
          files: data.files
        };
        foldersData.push(folder);
      }
    });

    const files = { folders: foldersData, files: filesData };
    return files;
  } catch (error) {
    console.error('Error getting documents', error);
    throw new Error('Failed to fetch files from the db');
  }
};


export const getAllFilesOfUser = async () => {
  try {
    if (!auth.currentUser?.uid) throw new Error("User must logged in to view files");
    return getAllFilesOfUserFromDB(auth.currentUser?.uid);
    // const getAllFilesOfUser = httpsCallable(functions, "getAllFilesOfUser");
    // const result: any = (await getAllFilesOfUser()).data;
    // return result;
  } catch (error: any) {
    console.error(error);
    return { error: error.message };
  }
}

export const renameFile = async (parameters: RenameFileParams) => {
  try {
    const renameFile = httpsCallable(functions, "renameFile");
    const result: any = (await renameFile(parameters)).data;
    return result;
  } catch (error: any) {
    console.error(error);
    return { error: error.message };
  }
}

export const deleteFile = async (fileId: string) => {
  try {
    const deleteFile = httpsCallable(functions, "deleteFile");
    const result: any = (await deleteFile(fileId)).data;
    return result;
  } catch (error: any) {
    console.error(error);
    return { error: error.message };
  }
}

export const createFolder = async (parameters: CreateFolderParams) => {
  try {
    const createFolder = httpsCallable(functions, "createFolder");
    const result: any = (await createFolder(parameters)).data;
    return result;
  } catch (error: any) {
    console.error(error);
    return { error: error.message };
  }
}

export const moveFileToFolder = async (parameters: MoveFileToFolderParams) => {
  try {
    const moveFileToFolder = httpsCallable(functions, "moveFileToFolder");
    const result: any = (await moveFileToFolder(parameters)).data;
    return result;
  } catch (error: any) {
    console.error(error);
    return { error: error.message };
  }
}

export const renameFolder = async (parameters: RenameFolderParams) => {
  try {
    const renameFolder = httpsCallable(functions, "renameFolder");
    const result: any = (await renameFolder(parameters)).data;
    return result;
  } catch (error: any) {
    console.error(error);
    return { error: error.message };
  }
}
