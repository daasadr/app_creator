import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:get/get.dart';
import 'package:firebase_core/firebase_core.dart';
import 'firebase_options.dart';
import 'controllers/app_controller.dart';
import 'screens/home_screen.dart';
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
      ],
      child: GetMaterialApp(
        title: 'Generated App',
        theme: ThemeData(
          primarySwatch: Colors.blue,
          useMaterial3: true,
        ),
        home: const HomeScreen(),
      ),
    );
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
            appId
          );
        } else {
          // Fallback to assets only - use the data from config.json
          controller.initializeAppData(
            List<Map<String, dynamic>>.from(config['pages'] ?? []),
            Map<String, dynamic>.from(config['settings'] ?? {}),
            null
          );
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
