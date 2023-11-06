import { initializeApp } from "firebase/app";
import { GoogleAuthProvider, connectAuthEmulator, getAuth, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup, signOut } from "firebase/auth";
import { connectFirestoreEmulator, doc, getDoc, getFirestore } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions, httpsCallable } from "firebase/functions";
import { getAnalytics } from "firebase/analytics";
import { isValidEmail, isValidName, isValidPassword } from "../utils/validations";

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

// if (process.env.NODE_ENV === 'development') {
//   connectFirestoreEmulator(db, "localhost", 8080);
//   connectFunctionsEmulator(functions, "localhost", 5001);
//   connectAuthEmulator(auth, "http://localhost:9099");
// }

const googleProvider = new GoogleAuthProvider();


export const signInWithGoogle = async () => {
  const res = await signInWithPopup(auth, googleProvider);
  const user = res.user;
  const signInWithGoogle = httpsCallable(functions, 'signInWithGoogle');
  await signInWithGoogle({ uid: user.uid });
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
      // console.log("No such user!");
      return null;
    }
  } catch (err) {
    // console.error(err);
    return null;
  }
};

