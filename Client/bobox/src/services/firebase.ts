import { initializeApp } from "firebase/app";
import { GoogleAuthProvider, connectAuthEmulator, getAuth, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup, signOut } from "firebase/auth";
import { connectFirestoreEmulator, doc, getDoc, getFirestore } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions, httpsCallable } from "firebase/functions";
import { getAnalytics } from "firebase/analytics";
import { isValidEmail, isValidName, isValidPassword } from "../utils/validations";
import { AbortMultiPartUploadParameters, CompleteMultiPartParameters, UploadFileParameters, UploadPartParameters } from "../utils/types";

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
const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);
const functions = getFunctions(app);

if (process.env.NODE_ENV === 'development') {
  connectFirestoreEmulator(db, "localhost", 8080);
  connectFunctionsEmulator(functions, "localhost", 5001);
  connectAuthEmulator(auth, "http://localhost:9099");
}

const googleProvider = new GoogleAuthProvider();


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


export const initiateSmallFileUpload = async (parameters: UploadFileParameters) => {
  try {
    const getUploadFileURL = httpsCallable(functions, "initiateSmallFileUpload");
    console.log("Parameters: ", parameters);
    const result: any = (await getUploadFileURL(parameters)).data;
    console.log(result);
    return result;
  } catch (error) {
    console.log(error);
    return null;
  }
};

export const CompleteSmallFileUpload = async (fileId: string) => {
  try {
    const completeSmallFileUpload = httpsCallable(functions, "CompleteSmallFileUpload");
    console.log("Parameters: ", fileId);
    const result: any = (await completeSmallFileUpload(fileId)).data
    return result.toString() === "SUCCESS" ? true : false;
  } catch (error) {
    console.log(error);
    return null;
  }
};

export const initiateMultipartUpload = async (parameters: UploadFileParameters) => {
  try {
    const startMultipartUpload = httpsCallable(functions, "initiateMultipartUpload");
    console.log("Parameters: ", parameters);
    const result: any = (await startMultipartUpload(parameters)).data;
    return result;
  } catch (error) {
    console.log(error);
    return null;
  }
};

export const generateUploadPartURL = async (parameters: UploadPartParameters) => {
  try {
    const getUploadPartURL = httpsCallable(functions, "generateUploadPartURL");
    console.log("Parameters: ", parameters);
    const result: any = (await getUploadPartURL(parameters)).data;
    return result.toString();
  } catch (error) {
    console.log(error);
    return null;
  }
};

export const completeMultipartUpload = async (parameters: CompleteMultiPartParameters) => {
  try {
    const endMultipartUpload = httpsCallable(functions, "completeMultipartUpload");
    console.log("Parameters: ", parameters);
    const result: any = (await endMultipartUpload(parameters)).data
    return result.toString() === "SUCCESS" ? true : false;
  } catch (error) {
    console.log(error);
    return null;
  }
};

export const AbortMultipartUpload = async (parameters: AbortMultiPartUploadParameters) => {
  try {
    const cancelMultipartUpload = httpsCallable(functions, "AbortMultipartUpload");
    console.log("Parameters: ", parameters);
    const result: any = (await cancelMultipartUpload(parameters)).data;
    return result.toString() === "SUCCESS" ? true : false;
  } catch (error) {
    console.log(error);
    return null;
  }
};