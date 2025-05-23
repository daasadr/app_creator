# Generated Flutter App

This is a Flutter application template that includes:
- Firebase integration for notifications and data storage
- WebView support for displaying web content
- Admin panel for managing content and notifications
- Material Design 3 UI

## Setup Instructions

1. Install Flutter:
   - Follow the [official Flutter installation guide](https://flutter.dev/docs/get-started/install)
   - Make sure you have Android Studio and Xcode (for iOS development) installed

2. Configure Firebase:
   - Create a new Firebase project at [Firebase Console](https://console.firebase.google.com)
   - Add Android and iOS apps to your Firebase project
   - Download and add the configuration files:
     - For Android: `google-services.json` to `android/app/`
     - For iOS: `GoogleService-Info.plist` to `ios/Runner/`
   - Update the Firebase configuration in `lib/firebase_options.dart`

3. Install dependencies:
   ```bash
   flutter pub get
   ```

4. Run the app:
   ```bash
   flutter run
   ```

## Features

### Admin Panel
- Access the admin panel by tapping the settings icon in the app bar
- Manage content pages and WebView pages
- Send push notifications to all users

### Content Management
- Add new content pages with title and content
- Add WebView pages with title and URL
- All content is stored in Firebase Firestore

### Push Notifications
- Users receive push notifications for updates
- Admin can send notifications to all users
- Notifications work in both foreground and background

## Development

### Project Structure
```
lib/
  ├── main.dart              # App entry point
  ├── firebase_options.dart  # Firebase configuration
  └── screens/
      ├── home_screen.dart   # Main screen with content list
      └── admin_screen.dart  # Admin panel
```

### Adding New Features
1. Add new dependencies to `pubspec.yaml`
2. Create new screens in the `screens/` directory
3. Update the navigation in `main.dart`
4. Add necessary Firebase collections and security rules

## Building for Production

### Android
```bash
flutter build apk --release
```

### iOS
```bash
flutter build ios --release
```

## Security Considerations
- Firebase security rules should be properly configured
- Admin access should be restricted
- Sensitive data should be encrypted
- Regular security audits should be performed

## Support
For issues and feature requests, please create an issue in the repository. 