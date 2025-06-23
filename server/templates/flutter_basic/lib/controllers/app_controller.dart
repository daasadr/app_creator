import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'dart:convert';

class AppController extends ChangeNotifier {
  bool _isLoading = false;
  String? _error;
  FirebaseFirestore? _firestore;
  FirebaseAuth? _auth;

  bool get isLoading => _isLoading;
  String? get error => _error;

  // App content - initialized by generator
  List<Map<String, dynamic>> _pages = [];
  List<Map<String, dynamic>> get pages => _pages;

  // App settings - initialized by generator
  Map<String, dynamic> _appSettings = {};
  Map<String, dynamic> get appSettings => _appSettings;

  // Get homepage (first page)
  Map<String, dynamic>? get homepage => _pages.isNotEmpty ? _pages.first : null;

  // Initialize data from generator
  void initializeAppData(List<Map<String, dynamic>> pages, Map<String, dynamic> settings) {
    _pages = pages;
    _appSettings = settings;
    notifyListeners();
  }

  // Initialize with generator data
  void initializeWithGeneratorData() {
    // Data will be loaded from assets/config.json
    loadAppContent();
  }

  // Load app content from assets
  Future<void> loadAppContent() async {
    _setLoading(true);
    try {
      // Try to load from Firebase first
      if (await _initializeFirebase()) {
        await _loadFromFirebase();
      } else {
        // Fallback to local assets
        await _loadFromAssets();
      }
    } catch (e) {
      _setError('Failed to load app content: $e');
      // Try to load from assets as fallback
      try {
        await _loadFromAssets();
      } catch (assetError) {
        _setError('Failed to load from assets: $assetError');
      }
    }
    _setLoading(false);
  }

  // Initialize Firebase
  Future<bool> _initializeFirebase() async {
    try {
      if (Firebase.apps.isNotEmpty) {
        _firestore = FirebaseFirestore.instance;
        _auth = FirebaseAuth.instance;
        return true;
      }
      return false;
    } catch (e) {
      print('Firebase not available: $e');
      return false;
    }
  }

  // Load data from Firebase
  Future<void> _loadFromFirebase() async {
    if (_firestore == null) return;

    try {
      final doc = await _firestore!.collection('apps').doc('main').get();
      if (doc.exists) {
        final data = doc.data()!;
        _pages = List<Map<String, dynamic>>.from(data['pages'] ?? []);
        _appSettings = Map<String, dynamic>.from(data['settings'] ?? {});
        notifyListeners();
      }
    } catch (e) {
      print('Firebase load error: $e');
      throw e;
    }
  }

  // Load data from assets
  Future<void> _loadFromAssets() async {
    try {
      final configString = await rootBundle.loadString('assets/config.json');
      final config = json.decode(configString);
      _pages = List<Map<String, dynamic>>.from(config['pages'] ?? []);
      _appSettings = Map<String, dynamic>.from(config['settings'] ?? {});
      notifyListeners();
    } catch (e) {
      print('Assets load error: $e');
      throw e;
    }
  }

  // Save data to Firebase
  Future<void> saveToFirebase() async {
    if (_firestore == null) return;

    try {
      await _firestore!.collection('apps').doc('main').set({
        'pages': _pages,
        'settings': _appSettings,
        'updatedAt': FieldValue.serverTimestamp(),
      });
    } catch (e) {
      _setError('Failed to save to Firebase: $e');
    }
  }

  // Save data to local storage
  Future<void> saveToLocal() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('app_pages', json.encode(_pages));
      await prefs.setString('app_settings', json.encode(_appSettings));
    } catch (e) {
      _setError('Failed to save to local storage: $e');
    }
  }

  // Load data from local storage
  Future<void> loadFromLocal() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final pagesString = prefs.getString('app_pages');
      final settingsString = prefs.getString('app_settings');
      
      if (pagesString != null) {
        _pages = List<Map<String, dynamic>>.from(json.decode(pagesString));
      }
      if (settingsString != null) {
        _appSettings = Map<String, dynamic>.from(json.decode(settingsString));
      }
      notifyListeners();
    } catch (e) {
      _setError('Failed to load from local storage: $e');
    }
  }

  // Update page content
  void updatePage(int index, Map<String, dynamic> newContent) {
    if (index >= 0 && index < _pages.length) {
      _pages[index] = newContent;
      notifyListeners();
      saveToLocal();
      if (_firestore != null) {
        saveToFirebase();
      }
    }
  }

  // Add new page
  void addPage(Map<String, dynamic> page) {
    _pages.add(page);
    notifyListeners();
    saveToLocal();
    if (_firestore != null) {
      saveToFirebase();
    }
  }

  // Remove page
  void removePage(int index) {
    if (index >= 0 && index < _pages.length) {
      _pages.removeAt(index);
      notifyListeners();
      saveToLocal();
      if (_firestore != null) {
        saveToFirebase();
      }
    }
  }

  // Update app settings
  void updateSettings(Map<String, dynamic> newSettings) {
    _appSettings = newSettings;
    notifyListeners();
    saveToLocal();
    if (_firestore != null) {
      saveToFirebase();
    }
  }

  // Helper methods
  void _setLoading(bool loading) {
    _isLoading = loading;
    notifyListeners();
  }

  void _setError(String error) {
    _error = error;
    notifyListeners();
  }

  void clearError() {
    _error = null;
    notifyListeners();
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
