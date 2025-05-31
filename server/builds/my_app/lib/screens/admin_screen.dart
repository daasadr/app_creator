import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';

const String appId = 'demoApp'; // TODO: nahradit dynamicky

class AdminScreen extends StatefulWidget {
  const AdminScreen({super.key});

  @override
  State<AdminScreen> createState() => _AdminScreenState();
}

class _AdminScreenState extends State<AdminScreen> {
  final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final FirebaseStorage _storage = FirebaseStorage.instance;
  final ImagePicker _picker = ImagePicker();
  final TextEditingController _notificationTitleController =
      TextEditingController();
  final TextEditingController _notificationBodyController =
      TextEditingController();
  final TextEditingController _pageTitleController = TextEditingController();
  final TextEditingController _pageContentController = TextEditingController();
  final TextEditingController _webviewUrlController = TextEditingController();
  final TextEditingController _hiddenSelectorsController =
      TextEditingController();
  String _newPageType = 'content';
  String? _selectedImageUrl;
  File? _selectedImageFile;

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

  Future<void> _pickImage() async {
    try {
      final XFile? image = await _picker.pickImage(source: ImageSource.gallery);
      if (image != null) {
        setState(() {
          _selectedImageFile = File(image.path);
        });
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error picking image: $e')),
      );
    }
  }

  Future<String?> _uploadImage() async {
    if (_selectedImageFile == null) return null;

    try {
      final ref = _storage
          .ref()
          .child('images/${DateTime.now().millisecondsSinceEpoch}.jpg');
      await ref.putFile(_selectedImageFile!);
      return await ref.getDownloadURL();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error uploading image: $e')),
      );
      return null;
    }
  }

  Future<void> _addOrUpdatePage({String? pageId}) async {
    final isWebView = _newPageType == 'webview';

    // Upload image if selected
    String? imageUrl;
    if (_selectedImageFile != null) {
      imageUrl = await _uploadImage();
    }

    final data = {
      'title': _pageTitleController.text,
      'type': _newPageType,
      'content': isWebView ? null : _pageContentController.text,
      'url': isWebView ? _webviewUrlController.text : null,
      'imageUrl': imageUrl,
      'hiddenSelectors': isWebView && _hiddenSelectorsController.text.isNotEmpty
          ? _hiddenSelectorsController.text
              .split(',')
              .map((e) => e.trim())
              .toList()
          : [],
      'updatedAt': FieldValue.serverTimestamp(),
    };
    if (pageId == null) {
      final doc = await _firestore
          .collection('apps')
          .doc(appId)
          .collection('pages')
          .add(data);
      // Přidej do menu
      final appDoc = _firestore.collection('apps').doc(appId);
      final appSnap = await appDoc.get();
      final menu =
          List<Map<String, dynamic>>.from(appSnap.data()?['menu'] ?? []);
      menu.add({'pageId': doc.id, 'title': _pageTitleController.text});
      await appDoc.update({'menu': menu});
    } else {
      await _firestore
          .collection('apps')
          .doc(appId)
          .collection('pages')
          .doc(pageId)
          .update(data);
      // Aktualizuj název v menu
      final appDoc = _firestore.collection('apps').doc(appId);
      final appSnap = await appDoc.get();
      final menu =
          List<Map<String, dynamic>>.from(appSnap.data()?['menu'] ?? []);
      for (var item in menu) {
        if (item['pageId'] == pageId) item['title'] = _pageTitleController.text;
      }
      await appDoc.update({'menu': menu});
    }
    _pageTitleController.clear();
    _pageContentController.clear();
    _webviewUrlController.clear();
    _hiddenSelectorsController.clear();
    setState(() {
      _selectedImageFile = null;
      _selectedImageUrl = null;
    });
  }

  Future<void> _deletePage(String pageId) async {
    await _firestore
        .collection('apps')
        .doc(appId)
        .collection('pages')
        .doc(pageId)
        .delete();
    final appDoc = _firestore.collection('apps').doc(appId);
    final appSnap = await appDoc.get();
    final menu = List<Map<String, dynamic>>.from(appSnap.data()?['menu'] ?? []);
    menu.removeWhere((item) => item['pageId'] == pageId);
    await appDoc.update({'menu': menu});
    setState(() {});
  }

  Future<void> _moveMenuItem(int oldIndex, int newIndex) async {
    final appDoc = _firestore.collection('apps').doc(appId);
    final appSnap = await appDoc.get();
    final menu = List<Map<String, dynamic>>.from(appSnap.data()?['menu'] ?? []);
    if (oldIndex < 0 ||
        oldIndex >= menu.length ||
        newIndex < 0 ||
        newIndex >= menu.length) {
      return;
    }
    final item = menu.removeAt(oldIndex);
    menu.insert(newIndex, item);
    await appDoc.update({'menu': menu});
    setState(() {});
  }

  void _editPageDialog({String? pageId, Map<String, dynamic>? pageData}) {
    if (pageData != null) {
      _pageTitleController.text = pageData['title'] ?? '';
      _newPageType = pageData['type'] ?? 'content';
      _pageContentController.text = pageData['content'] ?? '';
      _webviewUrlController.text = pageData['url'] ?? '';
      _selectedImageUrl = pageData['imageUrl'];
      _hiddenSelectorsController.text =
          (pageData['hiddenSelectors'] ?? []).join(', ');
    } else {
      _pageTitleController.clear();
      _newPageType = 'content';
      _pageContentController.clear();
      _webviewUrlController.clear();
      _selectedImageUrl = null;
      _selectedImageFile = null;
      _hiddenSelectorsController.clear();
    }
    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setStateDialog) => AlertDialog(
          title: Text(pageId == null ? 'Přidat stránku' : 'Upravit stránku'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: _pageTitleController,
                  decoration: const InputDecoration(labelText: 'Název stránky'),
                  onChanged: (_) => setStateDialog(() {}),
                ),
                const SizedBox(height: 8),
                DropdownButton<String>(
                  value: _newPageType,
                  items: const [
                    DropdownMenuItem(
                        value: 'content', child: Text('Content stránka')),
                    DropdownMenuItem(
                        value: 'webview', child: Text('WebView stránka')),
                  ],
                  onChanged: (val) {
                    if (val != null) {
                      setStateDialog(() {
                        _newPageType = val;
                      });
                    }
                  },
                ),
                if (_newPageType == 'content') ...[
                  const SizedBox(height: 16),
                  ElevatedButton.icon(
                    onPressed: () async {
                      await _pickImage();
                      setStateDialog(() {});
                    },
                    icon: const Icon(Icons.image),
                    label: const Text('Vybrat obrázek'),
                  ),
                  if (_selectedImageFile != null ||
                      _selectedImageUrl != null) ...[
                    const SizedBox(height: 8),
                    Container(
                      height: 200,
                      width: double.infinity,
                      decoration: BoxDecoration(
                        border: Border.all(color: Colors.grey),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: _selectedImageFile != null
                          ? Image.file(_selectedImageFile!, fit: BoxFit.cover)
                          : Image.network(_selectedImageUrl!,
                              fit: BoxFit.cover),
                    ),
                  ],
                  const SizedBox(height: 16),
                  TextField(
                    controller: _pageContentController,
                    decoration:
                        const InputDecoration(labelText: 'Obsah stránky'),
                    maxLines: 5,
                    onChanged: (_) => setStateDialog(() {}),
                  ),
                ],
                if (_newPageType == 'webview') ...[
                  TextField(
                    controller: _webviewUrlController,
                    decoration: const InputDecoration(labelText: 'WebView URL'),
                    onChanged: (_) => setStateDialog(() {}),
                  ),
                  TextField(
                    controller: _hiddenSelectorsController,
                    decoration: const InputDecoration(
                        labelText:
                            'Skryté elementy (CSS selektory, oddělené čárkou)'),
                    onChanged: (_) => setStateDialog(() {}),
                  ),
                  // Základ pro kapátko (budoucí rozšíření)
                  const SizedBox(height: 8),
                  const Text('Základ pro kapátko: Zadejte CSS selektory ručně.'),
                ],
                const SizedBox(height: 16),
                // Náhled stránky
                if (_newPageType == 'content')
                  Container(
                    padding: const EdgeInsets.all(8),
                    color: Colors.grey[100],
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _pageTitleController.text,
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 4),
                        Text(_pageContentController.text),
                      ],
                    ),
                  ),
                if (_newPageType == 'webview' &&
                    _webviewUrlController.text.isNotEmpty)
                  SizedBox(
                    height: 300,
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: Builder(
                        builder: (context) {
                          final controller = WebViewController()
                            ..setJavaScriptMode(JavaScriptMode.unrestricted)
                            ..loadRequest(
                                Uri.parse(_webviewUrlController.text));
                          final selectors =
                              _hiddenSelectorsController.text.isNotEmpty
                                  ? _hiddenSelectorsController.text
                                      .split(',')
                                      .map((e) => e.trim())
                                      .toList()
                                  : [];
                          if (selectors.isNotEmpty) {
                            final js = selectors
                                .map((sel) =>
                                    "document.querySelectorAll('\\$sel').forEach(e=>e.style.display='none');")
                                .join('\n');
                            controller.runJavaScript(
                                "window.addEventListener('DOMContentLoaded', function() { $js });");
                          }
                          return WebViewWidget(controller: controller);
                        },
                      ),
                    ),
                  ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Zrušit'),
            ),
            ElevatedButton(
              onPressed: () async {
                await _addOrUpdatePage(pageId: pageId);
                Navigator.of(context).pop();
              },
              child: const Text('Uložit'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Admin Panel')),
      body: StreamBuilder<DocumentSnapshot>(
        stream: _firestore.collection('apps').doc(appId).snapshots(),
        builder: (context, appSnapshot) {
          if (!appSnapshot.hasData || !appSnapshot.data!.exists) {
            return const Center(child: CircularProgressIndicator());
          }
          final appData = appSnapshot.data!.data() as Map<String, dynamic>;
          final List<dynamic> menu = appData['menu'] ?? [];
          return StreamBuilder<QuerySnapshot>(
            stream: _firestore
                .collection('apps')
                .doc(appId)
                .collection('pages')
                .snapshots(),
            builder: (context, pagesSnapshot) {
              if (!pagesSnapshot.hasData) {
                return const Center(child: CircularProgressIndicator());
              }
              final pagesMap = {
                for (var doc in pagesSnapshot.data!.docs)
                  doc.id: doc.data() as Map<String, dynamic>
              };
              return Column(
                children: [
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      ElevatedButton(
                        onPressed: () => _editPageDialog(),
                        child: const Text('Přidat stránku'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Expanded(
                    child: ListView.builder(
                      itemCount: menu.length,
                      itemBuilder: (context, index) {
                        final item = menu[index];
                        final pageId = item['pageId'];
                        final pageData = pagesMap[pageId];
                        return Card(
                          margin: const EdgeInsets.symmetric(
                              vertical: 6, horizontal: 12),
                          child: ListTile(
                            title: Text(item['title'] ?? ''),
                            subtitle: Text(pageData != null
                                ? (pageData['type'] ?? '')
                                : ''),
                            trailing: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                IconButton(
                                  icon: const Icon(Icons.arrow_upward),
                                  onPressed: index > 0
                                      ? () => _moveMenuItem(index, index - 1)
                                      : null,
                                ),
                                IconButton(
                                  icon: const Icon(Icons.arrow_downward),
                                  onPressed: index < menu.length - 1
                                      ? () => _moveMenuItem(index, index + 1)
                                      : null,
                                ),
                                IconButton(
                                  icon: const Icon(Icons.edit),
                                  onPressed: pageData != null
                                      ? () => _editPageDialog(
                                          pageId: pageId, pageData: pageData)
                                      : null,
                                ),
                                IconButton(
                                  icon: const Icon(Icons.delete),
                                  onPressed: () => _deletePage(pageId),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ],
              );
            },
          );
        },
      ),
    );
  }
}
