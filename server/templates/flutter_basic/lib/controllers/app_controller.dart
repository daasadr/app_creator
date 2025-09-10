import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'dart:convert';

class AppController extends ChangeNotifier {
  bool _isLoading = false;
  String? _error;
  FirebaseFirestore? _firestore;
  String? _appId; // ID aplikace pro načítání z Firestore
  bool _isOnline = false; // Stav připojení k internetu (default offline pro testování)

  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isOnline => _isOnline;

  // App content - loaded from Firestore or assets
  List<Map<String, dynamic>> _pages = [];
  List<Map<String, dynamic>> get pages => _pages;

  // App settings - loaded from Firestore or assets
  Map<String, dynamic> _appSettings = {};
  Map<String, dynamic> get appSettings => _appSettings;

  // Get homepage (first page)
  Map<String, dynamic>? get homepage => _pages.isNotEmpty ? _pages.first : null;

  // Initialize data from generator
  void initializeAppData(List<Map<String, dynamic>> pages,
      Map<String, dynamic> settings, String? appId) {
    _pages = pages;
    _appSettings = settings;
    _appId = appId;
    notifyListeners();
  }

  // Initialize with generator data
  void initializeWithGeneratorData() {
    // Data will be loaded from Firestore first, then fallback to assets
    loadAppContent();
  }

  // Load app content - try Firestore first, then fallback to assets
  Future<void> loadAppContent() async {
    _setLoading(true);
    try {
      // Try to load from Firestore first
      if (_appId != null && _firestore != null) {
        try {
          await _loadFromFirestore();
          print('Content loaded from Firestore');
          return;
        } catch (e) {
          print('Firestore load failed, trying local storage: $e');

          // Try local storage first
          try {
            await loadFromLocal();
            if (_pages.isNotEmpty) {
              print('Content loaded from local storage');
              return;
            }
          } catch (localError) {
            print('Local storage load failed: $localError');
          }
        }
      }

      // Fallback to assets
      await _loadFromAssets();
      print('Content loaded from assets');
    } catch (e) {
      _setError('Failed to load app content: $e');
    }
    _setLoading(false);
  }

  // Load data from Firestore
  Future<void> _loadFromFirestore() async {
    if (_firestore == null || _appId == null) {
      throw Exception('Firestore or appId not initialized');
    }

    try {
      final docRef = _firestore!.collection('apps').doc(_appId);
      final docSnap = await docRef.get();

      if (docSnap.exists) {
        final data = docSnap.data()!;
        _pages = List<Map<String, dynamic>>.from(data['menu'] ?? []);
        _appSettings = Map<String, dynamic>.from(data['settings'] ?? {});

        // Save to local storage for offline use
        await saveToLocal();
        notifyListeners();
      } else {
        throw Exception('App document not found in Firestore');
      }
    } catch (e) {
      print('Firestore load error: $e');
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

  // Initialize Firebase
  Future<void> initializeFirebase() async {
    try {
      _firestore = FirebaseFirestore.instance;
      print('Firebase initialized successfully');
    } catch (e) {
      print('Firebase initialization failed: $e');
      // Continue without Firebase
    }
  }

  // Initialize connectivity monitoring
  Future<void> initializeConnectivity() async {
    try {
      // Zkontroluj aktuální stav
      final connectivityResults = await Connectivity().checkConnectivity();
      _isOnline = connectivityResults.any((result) => result != ConnectivityResult.none);
      
      // Sleduj změny connectivity
      Connectivity().onConnectivityChanged.listen((List<ConnectivityResult> results) {
        final wasOnline = _isOnline;
        _isOnline = results.any((result) => result != ConnectivityResult.none);
        
        if (wasOnline != _isOnline) {
          print('Connectivity changed: ${_isOnline ? "Online" : "Offline"}');
          notifyListeners();
        }
      });
      
      print('Connectivity monitoring initialized: ${_isOnline ? "Online" : "Offline"}');
    } catch (e) {
      print('Connectivity initialization failed: $e');
      _isOnline = true; // Default to online if we can't detect
    }
  }
  
  // Metoda pro manuální přepnutí offline režimu (pro testování)
  void setOfflineMode(bool offline) {
    _isOnline = !offline;
    notifyListeners();
    print('Manual offline mode: ${offline ? "Offline" : "Online"}');
  }

  // Refresh content from Firestore
  Future<void> refreshContent() async {
    if (_appId != null && _firestore != null) {
      try {
        await _loadFromFirestore();
        print('Content refreshed from Firestore');
      } catch (e) {
        print('Failed to refresh content: $e');
      }
    }
  }

  // Update page content
  void updatePage(int index, Map<String, dynamic> newContent) {
    if (index >= 0 && index < _pages.length) {
      _pages[index] = newContent;
      notifyListeners();
      saveToLocal();
      if (_firestore != null) {
        // saveToFirebase();
      }
    }
  }

  // Add new page
  void addPage(Map<String, dynamic> page) {
    _pages.add(page);
    notifyListeners();
    saveToLocal();
    if (_firestore != null) {
      // saveToFirebase();
    }
  }

  // Remove page
  void removePage(int index) {
    if (index >= 0 && index < _pages.length) {
      _pages.removeAt(index);
      notifyListeners();
      saveToLocal();
      if (_firestore != null) {
        // saveToFirebase();
      }
    }
  }

  // Update app settings
  void updateSettings(Map<String, dynamic> newSettings) {
    _appSettings = newSettings;
    notifyListeners();
    saveToLocal();
    if (_firestore != null) {
      // saveToFirebase();
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
