import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:crypto/crypto.dart';
import 'dart:convert';

class AuthService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  // Get current user (app user, not Firebase Auth user)
  Map<String, dynamic>? currentUser;

  // Sign in app user with email and password
  Future<Map<String, dynamic>?> signInWithEmailAndPassword({
    required String email,
    required String password,
    required String appId,
  }) async {
    try {
      // Check if user exists in Firestore for this specific app
      final userSnapshot = await _firestore
          .collection('apps')
          .doc(appId)
          .collection('users')
          .where('email', isEqualTo: email)
          .limit(1)
          .get();

      if (userSnapshot.docs.isEmpty) {
        throw Exception('User not found');
      }

      final userData = userSnapshot.docs.first.data();

      // Verify password (simple hash comparison - in production use proper bcrypt)
      final hashedPassword = _hashPassword(password);
      if (userData['password'] != hashedPassword) {
        throw Exception('Invalid password');
      }

      // Update last login time
      await _updateLastLogin(userSnapshot.docs.first.id, appId);

      // Set current user
      currentUser = userData;
      currentUser!['id'] = userSnapshot.docs.first.id;

      return currentUser;
    } catch (e) {
      print('Sign in error: $e');
      rethrow;
    }
  }

  // Register new app user
  Future<Map<String, dynamic>?> registerWithEmailAndPassword({
    required String email,
    required String password,
    required String appId,
    String? displayName,
  }) async {
    try {
      // Check if user already exists
      final existingUser = await _firestore
          .collection('apps')
          .doc(appId)
          .collection('users')
          .where('email', isEqualTo: email)
          .limit(1)
          .get();

      if (existingUser.docs.isNotEmpty) {
        throw Exception(
            'The email address is already in use by another account.');
      }

      // Create new user
      final userData = {
        'email': email,
        'password': _hashPassword(password),
        'displayName': displayName ?? email.split('@').first,
        'createdAt': FieldValue.serverTimestamp(),
        'lastLoginAt': FieldValue.serverTimestamp(),
      };

      // Add user to Firestore
      final docRef = await _firestore
          .collection('apps')
          .doc(appId)
          .collection('users')
          .add(userData);

      // Set current user
      currentUser = userData;
      currentUser!['id'] = docRef.id;

      return currentUser;
    } catch (e) {
      print('Registration error: $e');
      rethrow;
    }
  }

  // Helper method to hash password
  String _hashPassword(String password) {
    var bytes = utf8.encode(password);
    var digest = sha256.convert(bytes);
    return digest.toString();
  }

  // Update last login time
  Future<void> _updateLastLogin(String userId, String appId) async {
    try {
      await _firestore
          .collection('apps')
          .doc(appId)
          .collection('users')
          .doc(userId)
          .update({
        'lastLoginAt': FieldValue.serverTimestamp(),
      });
    } catch (e) {
      print('Error updating last login: $e');
    }
  }

  // Sign in with Google (requires google_sign_in plugin)
  Future<Map<String, dynamic>?> signInWithGoogle({
    required String appId,
  }) async {
    try {
      // Note: Implement Google Sign-In based on app settings
      // This would require google_sign_in plugin and configuration
      throw Exception('Google Sign-In requires additional setup');
    } catch (e) {
      print('Google sign in error: $e');
      rethrow;
    }
  }

  // Sign out
  Future<void> signOut() async {
    currentUser = null;
  }

  // Reset password (simple implementation)
  Future<void> resetPassword(
      {required String email, required String appId}) async {
    try {
      // In a real app, you'd send an email with reset link
      // For now, we'll just find the user and update their password
      final userSnapshot = await _firestore
          .collection('apps')
          .doc(appId)
          .collection('users')
          .where('email', isEqualTo: email)
          .limit(1)
          .get();

      if (userSnapshot.docs.isEmpty) {
        throw Exception('User not found');
      }

      // Generate a random password
      final randomPassword = 'reset${DateTime.now().millisecondsSinceEpoch}';

      await _firestore
          .collection('apps')
          .doc(appId)
          .collection('users')
          .doc(userSnapshot.docs.first.id)
          .update({
        'password': _hashPassword(randomPassword),
        'passwordResetAt': FieldValue.serverTimestamp(),
      });

      print('Password reset. New password: $randomPassword');
    } catch (e) {
      print('Password reset error: $e');
      rethrow;
    }
  }

  // Get user data from Firestore
  Future<Map<String, dynamic>?> getUserData(String userId, String appId) async {
    try {
      final doc = await _firestore
          .collection('apps')
          .doc(appId)
          .collection('users')
          .doc(userId)
          .get();
      return doc.data();
    } catch (e) {
      print('Error getting user data: $e');
      return null;
    }
  }

  // Update user profile
  Future<void> updateUserProfile({
    required String userId,
    required String appId,
    String? displayName,
  }) async {
    try {
      final updateData = <String, dynamic>{};
      if (displayName != null) {
        updateData['displayName'] = displayName;
      }

      if (updateData.isNotEmpty) {
        await _firestore
            .collection('apps')
            .doc(appId)
            .collection('users')
            .doc(userId)
            .update(updateData);

        // Update current user if it's the same user
        if (currentUser?['id'] == userId) {
          updateData.forEach((key, value) {
            currentUser![key] = value;
          });
        }
      }
    } catch (e) {
      print('Error updating user profile: $e');
      rethrow;
    }
  }
}
