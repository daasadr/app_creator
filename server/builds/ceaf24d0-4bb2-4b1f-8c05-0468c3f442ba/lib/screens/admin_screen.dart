import 'package:flutter/material.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

class AdminScreen extends StatefulWidget {
  const AdminScreen({super.key});

  @override
  State<AdminScreen> createState() => _AdminScreenState();
}

class _AdminScreenState extends State<AdminScreen> {
  final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final TextEditingController _notificationTitleController =
      TextEditingController();
  final TextEditingController _notificationBodyController =
      TextEditingController();
  final TextEditingController _pageTitleController = TextEditingController();
  final TextEditingController _pageContentController = TextEditingController();
  final TextEditingController _webviewUrlController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _setupNotifications();
  }

  Future<void> _setupNotifications() async {
    // Request permission for notifications
    await _messaging.requestPermission(alert: true, badge: true, sound: true);

    // Get FCM token
    String? token = await _messaging.getToken();
    if (token != null) {
      // Save token to Firestore
      await _firestore.collection('devices').doc(token).set({
        'token': token,
        'createdAt': FieldValue.serverTimestamp(),
      });
    }
  }

  Future<void> _sendNotification() async {
    try {
      // Get all device tokens
      final devices = await _firestore.collection('devices').get();
      final tokens =
          devices.docs.map((doc) => doc.data()['token'] as String).toList();

      // Send notification to all devices
      await _firestore.collection('notifications').add({
        'title': _notificationTitleController.text,
        'body': _notificationBodyController.text,
        'tokens': tokens,
        'createdAt': FieldValue.serverTimestamp(),
      });

      // Clear controllers
      _notificationTitleController.clear();
      _notificationBodyController.clear();

      // Show success message
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Notification sent successfully')),
      );
    } catch (e) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Error sending notification: $e')));
    }
  }

  Future<void> _addPage() async {
    try {
      await _firestore.collection('pages').add({
        'title': _pageTitleController.text,
        'content': _pageContentController.text,
        'type': 'content',
        'createdAt': FieldValue.serverTimestamp(),
      });

      // Clear controllers
      _pageTitleController.clear();
      _pageContentController.clear();

      // Show success message
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Page added successfully')));
    } catch (e) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Error adding page: $e')));
    }
  }

  Future<void> _addWebViewPage() async {
    try {
      await _firestore.collection('pages').add({
        'title': _pageTitleController.text,
        'url': _webviewUrlController.text,
        'type': 'webview',
        'createdAt': FieldValue.serverTimestamp(),
      });

      // Clear controllers
      _pageTitleController.clear();
      _webviewUrlController.clear();

      // Show success message
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('WebView page added successfully')),
      );
    } catch (e) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Error adding WebView page: $e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Admin Panel'),
          bottom: const TabBar(
            tabs: [Tab(text: 'Notifications'), Tab(text: 'Pages')],
          ),
        ),
        body: TabBarView(
          children: [
            // Notifications Tab
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  TextField(
                    controller: _notificationTitleController,
                    decoration: const InputDecoration(
                      labelText: 'Notification Title',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: _notificationBodyController,
                    decoration: const InputDecoration(
                      labelText: 'Notification Body',
                      border: OutlineInputBorder(),
                    ),
                    maxLines: 3,
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: _sendNotification,
                    child: const Text('Send Notification'),
                  ),
                ],
              ),
            ),
            // Pages Tab
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  TextField(
                    controller: _pageTitleController,
                    decoration: const InputDecoration(
                      labelText: 'Page Title',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: _pageContentController,
                    decoration: const InputDecoration(
                      labelText: 'Page Content',
                      border: OutlineInputBorder(),
                    ),
                    maxLines: 5,
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: _webviewUrlController,
                    decoration: const InputDecoration(
                      labelText: 'WebView URL',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: ElevatedButton(
                          onPressed: _addPage,
                          child: const Text('Add Content Page'),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: ElevatedButton(
                          onPressed: _addWebViewPage,
                          child: const Text('Add WebView Page'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
