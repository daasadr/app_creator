import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

class AppController extends ChangeNotifier {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  User? get currentUser => _auth.currentUser;
  bool get isAdmin => currentUser?.email == 'admin@example.com';

  // App content
  List<Map<String, dynamic>> _pages = [
  {
    "title": "sdfdsfdsf",
    "type": "webview",
    "url": "https://video-zbrojak.cz",
    "content": "",
    "hiddenSelectors": [],
    "imageUrl": ""
  },
  {
    "title": "ggsfgfs",
    "type": "content",
    "content": "gsrrgrdshdgfdgfh",
    "hiddenSelectors": [],
    "imageUrl": ""
  },
  {
    "title": "dgrddg",
    "type": "content",
    "content": "rggregrg",
    "hiddenSelectors": [],
    "imageUrl": "https://firebasestorage.googleapis.com/v0/b/app-generator-dd106.firebasestorage.app/o/images%2F440746763_981495100169888_636738587175100468_n.jpg-1749136727794?alt=media&token=85512e03-dfcc-4abb-8f21-ada9fdc21b4e"
  }
];
  List<Map<String, dynamic>> get pages => _pages;

  // App settings
  Map<String, dynamic> _appSettings = {
  "description": "sdgfsdgsdg"
};
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
    try {
      final doc = await _firestore.collection('apps').doc('current').get();
      if (doc.exists) {
        final data = doc.data() ?? {};
        _pages = List<Map<String, dynamic>>.from(data['pages'] ?? []);
        notifyListeners();
      }
    } catch (e) {
      debugPrint('Error loading app content: $e');
    }
  }

  Future<void> loadAppSettings() async {
    try {
      final doc = await _firestore.collection('settings').doc('current').get();
      if (doc.exists) {
        _appSettings = doc.data() ?? {};
        notifyListeners();
      }
    } catch (e) {
      debugPrint('Error loading app settings: $e');
    }
  }

  Future<void> updateAppContent(List<Map<String, dynamic>> pages) async {
    try {
      await _firestore.collection('apps').doc('current').set({
        'pages': pages,
        'lastUpdated': FieldValue.serverTimestamp(),
      });
      _pages = pages;
      notifyListeners();
    } catch (e) {
      debugPrint('Error updating app content: $e');
    }
  }

  Future<void> updateAppSettings(Map<String, dynamic> settings) async {
    try {
      await _firestore.collection('settings').doc('current').set({
        ...settings,
        'lastUpdated': FieldValue.serverTimestamp(),
      });
      _appSettings = settings;
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
