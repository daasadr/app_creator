import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      return web;
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return ios;
      case TargetPlatform.macOS:
        return macos;
      case TargetPlatform.windows:
        throw UnsupportedError(
          'DefaultFirebaseOptions have not been configured for windows - '
          'you can reconfigure this by running the FlutterFire CLI again.',
        );
      case TargetPlatform.linux:
        throw UnsupportedError(
          'DefaultFirebaseOptions have not been configured for linux - '
          'you can reconfigure this by running the FlutterFire CLI again.',
        );
      default:
        throw UnsupportedError(
          'DefaultFirebaseOptions are not supported for this platform.',
        );
    }
  }

  static const FirebaseOptions web = FirebaseOptions(
    apiKey: 'AIzaSyA8HKV6sei0vW7DkURvdmp_BXYXvnIqqc',
    appId: '1:996188428571:web:5c3cfbeafd84c9f4119bbe',
    messagingSenderId: '996188428571',
    projectId: 'app-generator-dd106',
    authDomain: 'app-generator-dd106.firebaseapp.com',
    storageBucket: 'app-generator-dd106.firebasestorage.app',
    // measurementId není potřeba
  );

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyA8HKV6sei0vW7DkURvdmp_BXYXvnIqqc',
    appId: '1:996188428571:web:5c3cfbeafd84c9f4119bbe',
    messagingSenderId: '996188428571',
    projectId: 'app-generator-dd106',
    authDomain: 'app-generator-dd106.firebaseapp.com',
    storageBucket: 'app-generator-dd106.firebasestorage.app',
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'AIzaSyA8HKV6sei0vW7DkURvdmp_BXYXvnIqqc',
    appId: '1:996188428571:web:5c3cfbeafd84c9f4119bbe',
    messagingSenderId: '996188428571',
    projectId: 'app-generator-dd106',
    authDomain: 'app-generator-dd106.firebaseapp.com',
    storageBucket: 'app-generator-dd106.firebasestorage.app',
  );

  static const FirebaseOptions macos = FirebaseOptions(
    apiKey: 'AIzaSyA8HKV6sei0vW7DkURvdmp_BXYXvnIqqc',
    appId: '1:996188428571:web:5c3cfbeafd84c9f4119bbe',
    messagingSenderId: '996188428571',
    projectId: 'app-generator-dd106',
    authDomain: 'app-generator-dd106.firebaseapp.com',
    storageBucket: 'app-generator-dd106.firebasestorage.app',
  );
}
