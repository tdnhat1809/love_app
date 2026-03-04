import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyD1Mj8VpyRaiEbAZ0JoQiVwngJziaLDgkk",
    authDomain: "nhat-love-nhi.firebaseapp.com",
    projectId: "nhat-love-nhi",
    storageBucket: "nhat-love-nhi.firebasestorage.app",
    messagingSenderId: "315027103246",
    appId: "1:315027103246:web:9b1c1dcca0d4d98f65a65f"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export default app;
