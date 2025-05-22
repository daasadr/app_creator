import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:webview_flutter/webview_flutter.dart';

const String appId =
    'demoApp'; // TODO: nahradit dynamicky podle přihlášené aplikace

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _selectedIndex = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Home'),
        actions: [
          IconButton(
            icon: const Icon(Icons.admin_panel_settings),
            onPressed: () {
              Navigator.pushNamed(context, '/admin');
            },
          ),
        ],
      ),
      body: StreamBuilder<DocumentSnapshot>(
        stream: FirebaseFirestore.instance
            .collection('apps')
            .doc(appId)
            .snapshots(),
        builder: (context, appSnapshot) {
          if (appSnapshot.hasError) {
            return Center(child: Text('Error: \\${appSnapshot.error}'));
          }
          if (!appSnapshot.hasData || !appSnapshot.data!.exists) {
            return const Center(child: CircularProgressIndicator());
          }
          final appData = appSnapshot.data!.data() as Map<String, dynamic>;
          final List<dynamic> menu = appData['menu'] ?? [];

          return StreamBuilder<QuerySnapshot>(
            stream: FirebaseFirestore.instance
                .collection('apps')
                .doc(appId)
                .collection('pages')
                .snapshots(),
            builder: (context, pagesSnapshot) {
              if (pagesSnapshot.hasError) {
                return Center(child: Text('Error: \\${pagesSnapshot.error}'));
              }
              if (!pagesSnapshot.hasData) {
                return const Center(child: CircularProgressIndicator());
              }
              final pagesMap = {
                for (var doc in pagesSnapshot.data!.docs)
                  doc.id: doc.data() as Map<String, dynamic>
              };

              if (menu.isEmpty) {
                return const Center(child: Text('Menu je prázdné.'));
              }

              final selectedMenu = menu[_selectedIndex];
              final pageId = selectedMenu['pageId'];
              final pageData = pagesMap[pageId];

              return Column(
                children: [
                  SizedBox(
                    height: 56,
                    child: ListView.builder(
                      scrollDirection: Axis.horizontal,
                      itemCount: menu.length,
                      itemBuilder: (context, index) {
                        final item = menu[index];
                        return GestureDetector(
                          onTap: () {
                            setState(() {
                              _selectedIndex = index;
                            });
                          },
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 16, vertical: 12),
                            margin: const EdgeInsets.symmetric(
                                horizontal: 4, vertical: 8),
                            decoration: BoxDecoration(
                              color: _selectedIndex == index
                                  ? Colors.blue
                                  : Colors.grey[200],
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Center(
                              child: Text(
                                item['title'] ?? '',
                                style: TextStyle(
                                  color: _selectedIndex == index
                                      ? Colors.white
                                      : Colors.black,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                  const Divider(height: 1),
                  Expanded(
                    child: pageData == null
                        ? const Center(child: Text('Stránka nenalezena.'))
                        : _buildPage(pageData),
                  ),
                ],
              );
            },
          );
        },
      ),
    );
  }

  Widget _buildPage(Map<String, dynamic> page) {
    final type = page['type'] as String?;
    final title = page['title'] as String? ?? '';
    if (type == 'webview') {
      final url = page['url'] as String? ?? '';
      return WebViewPage(
          title: title,
          url: url,
          hiddenSelectors: page['hiddenSelectors'] ?? []);
    } else {
      final content = page['content'] as String? ?? '';
      return ContentPage(title: title, content: content);
    }
  }
}

class WebViewPage extends StatelessWidget {
  final String title;
  final String url;
  final List<dynamic> hiddenSelectors;

  const WebViewPage(
      {super.key,
      required this.title,
      required this.url,
      required this.hiddenSelectors});

  @override
  Widget build(BuildContext context) {
    final controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..loadRequest(Uri.parse(url));
    if (hiddenSelectors.isNotEmpty) {
      final js = hiddenSelectors
          .map((sel) =>
              "document.querySelectorAll('\\${sel}').forEach(e=>e.style.display='none');")
          .join('\n');
      controller.runJavaScript(
          "window.addEventListener('DOMContentLoaded', function() { $js });");
    }
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: WebViewWidget(controller: controller),
    );
  }
}

class ContentPage extends StatelessWidget {
  final String title;
  final String content;

  const ContentPage({super.key, required this.title, required this.content});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Text(content),
      ),
    );
  }
}
