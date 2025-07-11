import { initializeApp, getApps } from 'firebase/app'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
    apiKey: "AIzaSyA8HKV6seiOvWr7DkURvdmp_BXYXvnIqqc",
    authDomain: "app-generator-dd106.firebaseapp.com",
    projectId: "app-generator-dd106",
    storageBucket: "app-generator-dd106.firebasestorage.app",
    messagingSenderId: "996188428571",
    appId: "1:996188428571:web:5c3cfbeafd84c9f4119bbe",
    measurementId: "G-43YB15NM27"
  };

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
const storage = getStorage(app)

export { app, storage }