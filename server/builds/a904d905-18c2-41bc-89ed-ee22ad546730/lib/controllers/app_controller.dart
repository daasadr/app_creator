import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';

class AppController extends ChangeNotifier {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  bool _isLoading = false;
  String? _error;

  bool get isLoading => _isLoading;
  String? get error => _error;

  User? get currentUser => _auth.currentUser;
  bool get isAdmin => currentUser?.email == 'admin@example.com';

  // App content
  List<Map<String, dynamic>> _pages = [];
  List<Map<String, dynamic>> get pages => _pages;

  // App settings
  Map<String, dynamic> _appSettings = {};
  Map<String, dynamic> get appSettings => _appSettings;

  // Get homepage (first page)
  Map<String, dynamic>? get homepage => _pages.isNotEmpty ? _pages.first : null;

  // Vloží data při startu (vkládá generátor)
  void setInitialData(
      List<Map<String, dynamic>> pages, Map<String, dynamic> settings) {
    _pages = pages;
    _appSettings = settings;
    notifyListeners();
  }

  Future<void> loadAppContent() async {
    debugPrint('loadAppContent: start');
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      // 1. Načti z assets/config.json (offline fallback)
      debugPrint('loadAppContent: loading assets/config.json');
      String assetData = await rootBundle.loadString('assets/config.json');
      debugPrint('loadAppContent: loaded assets/config.json');
      Map<String, dynamic> assetConfig = json.decode(assetData);

      if (assetConfig['pages'] == null || assetConfig['settings'] == null) {
        debugPrint('loadAppContent: Invalid config.json format');
        throw Exception('Invalid config.json format');
      }

      _pages = List<Map<String, dynamic>>.from(assetConfig['pages'] ?? []);
      _appSettings = Map<String, dynamic>.from(assetConfig['settings'] ?? {});
      debugPrint(
          'loadAppContent: loaded from assets, pages count: [32m[1m${_pages.length}[0m');

      // 2. Zkus načíst z cache
      final prefs = await SharedPreferences.getInstance();
      String? cachedContent = prefs.getString('app_content');
      String? cachedSettings = prefs.getString('app_settings');

      if (cachedContent != null) {
        try {
          Map<String, dynamic> cachedConfig = json.decode(cachedContent);
          int cachedVersion = cachedConfig['version'] ?? 0;
          int assetVersion = assetConfig['settings']['version'] ?? 0;

          if (cachedVersion > assetVersion) {
            _pages =
                List<Map<String, dynamic>>.from(cachedConfig['pages'] ?? []);
            debugPrint(
                'loadAppContent: Using cached content version: $cachedVersion');
          }
        } catch (e) {
          debugPrint('loadAppContent: Error parsing cached content: $e');
        }
      }

      if (cachedSettings != null) {
        try {
          Map<String, dynamic> cachedSettingsMap = json.decode(cachedSettings);
          int cachedVersion = cachedSettingsMap['version'] ?? 0;
          int assetVersion = assetConfig['settings']['version'] ?? 0;

          if (cachedVersion > assetVersion) {
            _appSettings = cachedSettingsMap;
            debugPrint(
                'loadAppContent: Using cached settings version: $cachedVersion');
          }
        } catch (e) {
          debugPrint('loadAppContent: Error parsing cached settings: $e');
        }
      }

      // 3. Zkus načíst z Firestore (pokud je internet)
      try {
        debugPrint('loadAppContent: loading from Firestore');
        final contentDoc =
            await _firestore.collection('apps').doc('current').get();
        if (contentDoc.exists) {
          final data = contentDoc.data() ?? {};
          int onlineVersion = data['version'] ?? 0;
          int currentVersion = _appSettings['version'] ?? 0;

          if (onlineVersion > currentVersion) {
            _pages = List<Map<String, dynamic>>.from(data['pages'] ?? []);
            await prefs.setString(
                'app_content',
                json.encode({
                  'pages': _pages,
                  'version': onlineVersion,
                }));
            debugPrint(
                'loadAppContent: Updated content from Firestore version: $onlineVersion');
          }
        }

        final settingsDoc =
            await _firestore.collection('settings').doc('current').get();
        if (settingsDoc.exists) {
          final data = settingsDoc.data() ?? {};
          int onlineVersion = data['version'] ?? 0;
          int currentVersion = _appSettings['version'] ?? 0;

          if (onlineVersion > currentVersion) {
            _appSettings = data;
            await prefs.setString('app_settings', json.encode(_appSettings));
            debugPrint(
                'loadAppContent: Updated settings from Firestore version: $onlineVersion');
          }
        }
      } catch (e) {
        debugPrint('loadAppContent: Error loading online content: $e');
      }

      if (_pages.isEmpty) {
        debugPrint('loadAppContent: No pages loaded from any source');
        throw Exception('No pages loaded from any source');
      }
    } catch (e) {
      _error = e.toString();
      debugPrint('loadAppContent: Error: $e');
    } finally {
      _isLoading = false;
      debugPrint(
          'loadAppContent: finished, isLoading=$_isLoading, error=$_error');
      notifyListeners();
    }
  }

  Future<void> loadAppSettings() async {
    // Nastavení se načítají společně s obsahem v loadAppContent()
  }

  Future<void> updateAppContent(List<Map<String, dynamic>> pages) async {
    try {
      int newVersion = (_appSettings['version'] ?? 0) + 1;
      await _firestore.collection('apps').doc('current').set({
        'pages': pages,
        'version': newVersion,
        'lastUpdated': FieldValue.serverTimestamp(),
      });
      _pages = pages;

      // Aktualizuj cache
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(
          'app_content',
          json.encode({
            'pages': pages,
            'version': newVersion,
          }));

      notifyListeners();
    } catch (e) {
      debugPrint('Error updating app content: $e');
    }
  }

  Future<void> updateAppSettings(Map<String, dynamic> settings) async {
    try {
      int newVersion = (settings['version'] ?? 0) + 1;
      settings['version'] = newVersion;

      await _firestore.collection('settings').doc('current').set({
        ...settings,
        'lastUpdated': FieldValue.serverTimestamp(),
      });
      _appSettings = settings;

      // Aktualizuj cache
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('app_settings', json.encode(settings));

      notifyListeners();
    } catch (e) {
      debugPrint('Error updating app settings: $e');
    }
  }

  Future<void> signIn(String email, String password) async {
    try {
      await _auth.signInWithEmailAndPassword(
        email: email,
        password: password,
      );
      notifyListeners();
    } catch (e) {
      debugPrint('Error signing in: $e');
      rethrow;
    }
  }

  Future<void> signOut() async {
    try {
      await _auth.signOut();
      notifyListeners();
    } catch (e) {
      debugPrint('Error signing out: $e');
    }
  }

  // Helper methods for content
  Map<String, dynamic>? getPageById(String id) {
    try {
      return _pages.firstWhere((page) => page['id'] == id);
    } catch (e) {
      return null;
    }
  }

  List<Map<String, dynamic>> getPagesByType(String type) {
    return _pages.where((page) => page['type'] == type).toList();
  }
}
