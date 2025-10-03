import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:get/get.dart';
import 'package:firebase_core/firebase_core.dart';
import 'firebase_options.dart';
import 'controllers/app_controller.dart';
import 'providers/auth_provider.dart';
import 'screens/home_screen.dart';
import 'screens/auth_screen.dart';
import 'dart:convert';
import 'package:flutter/services.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Inicializace Firebase (volitelně)
  try {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
    print('Firebase initialized successfully');
  } catch (e) {
    print('Firebase initialization failed: $e');
    // Pokračuj bez Firebase
  }

  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) {
          final controller = AppController();
          // Initialize Firebase and load app data
          _initializeApp(controller);
          return controller;
        }),
        ChangeNotifierProvider(create: (_) => AuthProvider()),
      ],
      child: GetMaterialApp(
        title: 'Generated App',
        theme: ThemeData(
          primarySwatch: Colors.blue,
          useMaterial3: true,
        ),
        home: Consumer<AuthProvider>(
          builder: (context, authProvider, _) {
            return Consumer<AppController>(
              builder: (context, appController, _) {
                // Show auth screen if user accounts are enabled and user is not logged in
                if (_shouldShowAuth(authProvider, appController)) {
                  return const AuthScreen();
                }
                return const HomeScreen();
              },
            );
          },
        ),
      ),
    );
  }

  bool _shouldShowAuth(AuthProvider authProvider, AppController appController) {
    // Set app ID from controller to auth provider
    if (appController.appId != null) {
      authProvider.setAppId(appController.appId!);
    }

    // Check if user accounts are enabled in app settings
    final settings = appController.appSettings;
    final userAccountsEnabled = settings['userAccounts'] == true;

    // Check if there are login/register pages configured
    final hasAuthPages = appController.pages
        .any((page) => page['type'] == 'login' || page['type'] == 'register');

    // If auth pages are configured, let the app handle auth through pages
    // Only show default auth screen if no auth pages are configured
    if (hasAuthPages && userAccountsEnabled) {
      return false; // Let the app handle auth through configured pages
    }

    // Show auth screen only if user accounts are enabled AND user is not logged in AND no auth pages are configured
    return userAccountsEnabled &&
        !authProvider.isAuthenticated &&
        !hasAuthPages;
  }

  Future<void> _initializeApp(AppController controller) async {
    try {
      // Initialize Firebase
      await controller.initializeFirebase();

      // Initialize connectivity monitoring
      await controller.initializeConnectivity();

      // Try to get appId from assets/config.json
      try {
        final configString = await rootBundle.loadString('assets/config.json');
        final config = json.decode(configString);
        final appId = config['appId'] as String?;

        if (appId != null) {
          // Initialize with appId for Firestore loading
          controller.initializeAppData(
              List<Map<String, dynamic>>.from(config['pages'] ?? []),
              Map<String, dynamic>.from(config['settings'] ?? {}),
              appId);
        } else {
          // Fallback to assets only - use the data from config.json
          controller.initializeAppData(
              List<Map<String, dynamic>>.from(config['pages'] ?? []),
              Map<String, dynamic>.from(config['settings'] ?? {}),
              null);
        }
      } catch (e) {
        print('Failed to load config: $e');
        controller.initializeWithGeneratorData();
      }
    } catch (e) {
      print('App initialization failed: $e');
      controller.initializeWithGeneratorData();
    }
  }
}
