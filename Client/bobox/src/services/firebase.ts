import { initializeApp } from "firebase/app";
import { GoogleAuthProvider, getAuth, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup, signOut } from "firebase/auth";
import { collection, doc, getDoc, getDocs, getFirestore } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getAnalytics } from "firebase/analytics";

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
//  connectFirestoreEmulator(db, "localhost", 9000);
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
  const isValidEmail = (email: string): boolean => {
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return EMAIL_REGEX.test(email);
  };

  const isValidName = (name: string): boolean => {
    const NAME_REGEX = /^[A-Za-z\s]{2,}$/;
    return NAME_REGEX.test(name);
  };

  const isValidPassword = (password: string): boolean => {
    const PASSWORD_REGEX = /^(?=.{8,4096})(?:(?=(?:[^[A-Z]*[A-Z]){1,})|(?=(?:[^[a-z]*[a-z]){1,})|(?=(?:[^[\d]*\d){1,})|(?=(?:[^[\W_]*[\W_]){1,})){2,}\S{8,4096}$/
    return PASSWORD_REGEX.test(password);
  };

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

