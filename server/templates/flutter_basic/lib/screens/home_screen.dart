import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:get/get.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../controllers/app_controller.dart';
import 'dart:convert';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentPageIndex = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AppController>().loadAppContent();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Consumer<AppController>(
          builder: (context, controller, child) {
            return Text(controller.appSettings['appName'] ?? 'Generated App');
          },
        ),
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
        actions: [
          if (_currentPageIndex > 0)
            IconButton(
              icon: const Icon(Icons.home),
              onPressed: () {
                setState(() {
                  _currentPageIndex = 0;
                });
              },
              tooltip: 'Home',
            ),
        ],
      ),
      drawer: Consumer<AppController>(
        builder: (context, controller, child) {
          if (controller.pages.isEmpty) return SizedBox.shrink();
          
          return Drawer(
            child: ListView(
              padding: EdgeInsets.zero,
              children: [
                DrawerHeader(
                  decoration: BoxDecoration(
                    color: Theme.of(context).primaryColor,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        controller.appSettings['appName'] ?? 'Generated App',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        controller.appSettings['description'] ?? '',
                        style: const TextStyle(
                          color: Colors.white70,
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ),
                ),
                ...controller.pages.asMap().entries.map((entry) {
                  final index = entry.key;
                  final page = entry.value;
                  final title = page['title'] ?? 'Untitled';
                  final type = page['type'] ?? 'content';
                  
                  return ListTile(
                    leading: Icon(_getIconForType(type)),
                    title: Text(title),
                    selected: index == _currentPageIndex,
                    onTap: () {
                      setState(() {
                        _currentPageIndex = index;
                      });
                      Navigator.pop(context); // Zavře drawer
                    },
                  );
                }).toList(),
              ],
            ),
          );
        },
      ),
      body: Consumer<AppController>(
        builder: (context, controller, child) {
          if (controller.isLoading) {
            return const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircularProgressIndicator(),
                  SizedBox(height: 16),
                  Text('Loading app content...'),
                ],
              ),
            );
          }

          if (controller.error != null) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error, size: 64, color: Colors.red),
                  const SizedBox(height: 16),
                  Text(
                    'Error loading content',
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    controller.error!,
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () {
                      controller.clearError();
                      controller.loadAppContent();
                    },
                    child: const Text('Retry'),
                  ),
                ],
              ),
            );
          }

          if (controller.pages.isEmpty) {
            return const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.info, size: 64, color: Colors.blue),
                  SizedBox(height: 16),
                  Text(
                    'No content available',
                    style: TextStyle(fontSize: 18),
                  ),
                  SizedBox(height: 8),
                  Text(
                    'Please check your configuration',
                    style: TextStyle(fontSize: 14, color: Colors.grey),
                  ),
                ],
              ),
            );
          }

          // Zobraz aktuální stránku
          final currentPage = controller.pages[_currentPageIndex];
          return _buildPageContent(currentPage);
        },
      ),
    );
  }

  Widget _buildPageContent(Map<String, dynamic> page) {
    final title = page['title'] ?? 'Untitled';
    final type = page['type'] ?? 'content';
    final content = page['content'] ?? '';
    final url = page['url'] ?? '';
    final imageUrl = page['imageUrl'] ?? '';

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Nadpis stránky
          Text(
            title,
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 24),
          
          // Obsah podle typu
          if (type == 'content') ...[
            if (imageUrl.isNotEmpty) ...[
              Center(
                child: Image.network(
                  imageUrl,
                  height: 200,
                  width: double.infinity,
                  fit: BoxFit.cover,
                  errorBuilder: (context, error, stackTrace) {
                    return Container(
                      height: 200,
                      width: double.infinity,
                      color: Colors.grey[300],
                      child: const Icon(Icons.image, size: 64, color: Colors.grey),
                    );
                  },
                ),
              ),
              const SizedBox(height: 16),
            ],
            Text(
              content,
              style: Theme.of(context).textTheme.bodyLarge,
            ),
          ] else if (type == 'webview') ...[
            if (url.isNotEmpty) ...[
              Container(
                height: 400,
                width: double.infinity,
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.grey[300]!),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: WebViewWidget(
                    controller: WebViewController()
                      ..setJavaScriptMode(JavaScriptMode.unrestricted)
                      ..loadRequest(Uri.parse(url))
                      ..setNavigationDelegate(
                        NavigationDelegate(
                          onProgress: (int progress) {
                            // Můžete přidat progress indicator
                          },
                          onPageStarted: (String url) {
                            // Stránka začala načítat
                          },
                          onPageFinished: (String url) {
                            // Stránka dokončila načítání
                          },
                          onWebResourceError: (WebResourceError error) {
                            // Chyba při načítání
                          },
                        ),
                      ),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'URL: $url',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Colors.blue,
                ),
              ),
            ] else ...[
              const Center(
                child: Text('No URL provided for WebView'),
              ),
            ],
          ] else if (type == 'form') ...[
            _buildFormContent(content),
          ] else if (type == 'list') ...[
            _buildListContent(content),
          ] else ...[
            Text(
              content,
              style: Theme.of(context).textTheme.bodyLarge,
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildFormContent(String content) {
    try {
      final formData = Map<String, dynamic>.from(json.decode(content));
      final fields = List<Map<String, dynamic>>.from(formData['fields'] ?? []);

      return Column(
        children: fields.map((field) {
          final label = field['label'] ?? 'Field';
          final type = field['type'] ?? 'text';
          final required = field['required'] ?? false;

          return Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '$label${required ? ' *' : ''}',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                TextFormField(
                  decoration: InputDecoration(
                    border: const OutlineInputBorder(),
                    hintText: 'Enter $label',
                  ),
                ),
              ],
            ),
          );
        }).toList(),
      );
    } catch (e) {
      return Text('Form: $content');
    }
  }

  Widget _buildListContent(String content) {
    try {
      final listData = Map<String, dynamic>.from(json.decode(content));
      final items = List<String>.from(listData['items'] ?? []);

      return Column(
        children: items.map((item) {
          return Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Row(
              children: [
                const Icon(Icons.arrow_right, color: Colors.blue),
                const SizedBox(width: 8),
                Expanded(child: Text(item)),
              ],
            ),
          );
        }).toList(),
      );
    } catch (e) {
      return Text('List: $content');
    }
  }

  IconData _getIconForType(String type) {
    switch (type) {
      case 'content':
        return Icons.article;
      case 'webview':
        return Icons.web;
      case 'form':
        return Icons.input;
      case 'list':
        return Icons.list;
      default:
        return Icons.pageview;
    }
  }
}
