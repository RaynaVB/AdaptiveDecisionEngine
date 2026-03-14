import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAI, GoogleAIBackend } from "firebase/ai";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyA6savTju84iknVG1tTkR9VsT_0Y7DzNaY",
    authDomain: "adaptivehealthengine.firebaseapp.com",
    projectId: "adaptivehealthengine",
    storageBucket: "adaptivehealthengine.firebasestorage.app",
    messagingSenderId: "1052524332554",
    appId: "1:1052524332554:web:58e085b0fdb6f1f592c1f3",
    measurementId: "G-S1128RMJEW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const geminiAI = getAI(app, { backend: new GoogleAIBackend() });

export { app, auth, db, storage, geminiAI };
