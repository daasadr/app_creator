import 'package:flutter/material.dart';
import '../services/auth_service.dart';

class AuthProvider extends ChangeNotifier {
  final AuthService _authService = AuthService();

  Map<String, dynamic>? _user;
  bool _isLoading = false;
  String? _errorMessage;
  String? _appId;

  Map<String, dynamic>? get user => _user;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  bool get isAuthenticated => _user != null;

  // Set app ID for user operations
  void setAppId(String appId) {
    _appId = appId;
  }

  AuthProvider() {
    // No automatic initialization needed for custom auth
  }

  // Sign in
  Future<bool> signIn({
    required String email,
    required String password,
  }) async {
    if (_appId == null) {
      _setError('App ID not set');
      return false;
    }

    _setLoading(true);
    _setError(null);

    try {
      _user = await _authService.signInWithEmailAndPassword(
        email: email,
        password: password,
        appId: _appId!,
      );
      _setLoading(false);
      notifyListeners();
      return true;
    } catch (e) {
      _setError(_getErrorMessage(e));
      _setLoading(false);
      return false;
    }
  }

  // Register
  Future<bool> register({
    required String email,
    required String password,
    String? displayName,
  }) async {
    if (_appId == null) {
      _setError('App ID not set');
      return false;
    }

    _setLoading(true);
    _setError(null);

    try {
      _user = await _authService.registerWithEmailAndPassword(
        email: email,
        password: password,
        appId: _appId!,
        displayName: displayName,
      );
      _setLoading(false);
      notifyListeners();
      return true;
    } catch (e) {
      _setError(_getErrorMessage(e));
      _setLoading(false);
      return false;
    }
  }

  // Sign out
  Future<void> signOut() async {
    await _authService.signOut();
    _user = null;
    notifyListeners();
  }

  // Reset password
  Future<bool> resetPassword({required String email}) async {
    if (_appId == null) {
      _setError('App ID not set');
      return false;
    }
    _setLoading(true);
    _setError(null);

    try {
      await _authService.resetPassword(email: email, appId: _appId!);
      _setLoading(false);
      return true;
    } catch (e) {
      _setError(_getErrorMessage(e));
      _setLoading(false);
      return false;
    }
  }

  // Update profile
  Future<bool> updateProfile({
    String? displayName,
  }) async {
    if (_user == null || _appId == null) {
      _setError('User not authenticated or App ID not set');
      return false;
    }

    _setLoading(true);
    _setError(null);

    try {
      await _authService.updateUserProfile(
        userId: _user!['id'],
        appId: _appId!,
        displayName: displayName,
      );

      // Update local user data
      if (displayName != null) {
        _user!['displayName'] = displayName;
      }

      _setLoading(false);
      notifyListeners();
      return true;
    } catch (e) {
      _setError(_getErrorMessage(e));
      _setLoading(false);
      return false;
    }
  }

  void _setLoading(bool loading) {
    _isLoading = loading;
    notifyListeners();
  }

  void _setError(String? error) {
    _errorMessage = error;
    notifyListeners();
  }

  String _getErrorMessage(dynamic error) {
    if (error is Exception) {
      final message = error.toString();
      if (message.contains('User not found')) {
        return 'Uživatel s tímto emailem neexistuje';
      } else if (message.contains('Invalid password')) {
        return 'Nesprávné heslo';
      } else if (message.contains('already in use')) {
        return 'Email je již používán';
      } else if (message.contains('too weak')) {
        return 'Heslo je příliš slabé';
      } else if (message.contains('invalid email')) {
        return 'Neplatná emailová adresa';
      } else {
        return 'Chyba při přihlašování: ${error.toString()}';
      }
    }
    return 'Neznámá chyba: ${error.toString()}';
  }

  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }
}
