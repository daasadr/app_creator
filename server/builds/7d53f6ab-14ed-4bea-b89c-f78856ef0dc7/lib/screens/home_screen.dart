import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../controllers/app_controller.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<AppController>(context, listen: false).loadAppContent();
      Provider.of<AppController>(context, listen: false).loadAppSettings();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<AppController>(
      builder: (context, controller, child) {
        final pages = controller.pages;
        final settings = controller.appSettings;
        final homepage = controller.homepage;

        return Scaffold(
          appBar: AppBar(
            title: Text(settings['appName'] ?? 'App Generator'),
          ),
          body: pages.isEmpty
              ? const Center(child: CircularProgressIndicator())
              : _buildPageContent(homepage),
          bottomNavigationBar: pages.length > 1
              ? BottomNavigationBar(
                  currentIndex: 0, // Homepage is always first
                  items: pages.map((page) {
                    return BottomNavigationBarItem(
                      icon: Icon(_getIconForPageType(page['type'])),
                      label: page['title'] ?? 'Page',
                    );
                  }).toList(),
                  onTap: (index) {
                    // Navigate to page
                    final page = pages[index];
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => _buildPageScreen(page),
                      ),
                    );
                  },
                )
              : null,
        );
      },
    );
  }

  Widget _buildPageContent(Map<String, dynamic>? page) {
    if (page == null) return const SizedBox.shrink();

    switch (page['type']) {
      case 'content':
        return ListView.builder(
          itemCount: page['sections']?.length ?? 0,
          itemBuilder: (context, index) {
            final section = page['sections'][index];
            return _buildSection(section);
          },
        );
      case 'webview':
        return const Center(
            child: Text('WebView není na této platformě podporován.'));
      default:
        return const Center(child: Text('Unknown page type'));
    }
  }

  Widget _buildPageScreen(Map<String, dynamic> page) {
    return Scaffold(
      appBar: AppBar(
        title: Text(page['title'] ?? 'Page'),
      ),
      body: _buildPageContent(page),
    );
  }

  Widget _buildSection(Map<String, dynamic> section) {
    switch (section['type']) {
      case 'text':
        return Padding(
          padding: const EdgeInsets.all(16.0),
          child: Text(
            section['content'] ?? '',
            style: TextStyle(
              fontSize: section['fontSize']?.toDouble() ?? 16.0,
              fontWeight: section['isBold'] == true
                  ? FontWeight.bold
                  : FontWeight.normal,
            ),
          ),
        );
      case 'image':
        return Padding(
          padding: const EdgeInsets.all(16.0),
          child: Image.network(
            section['url'] ?? '',
            fit: BoxFit.cover,
            errorBuilder: (context, error, stackTrace) {
              return const Icon(Icons.error);
            },
          ),
        );
      case 'video':
        return Padding(
          padding: const EdgeInsets.all(16.0),
          child: AspectRatio(
            aspectRatio: 16 / 9,
            child: Image.network(
              section['thumbnailUrl'] ?? '',
              fit: BoxFit.cover,
              errorBuilder: (context, error, stackTrace) {
                return const Icon(Icons.error);
              },
            ),
          ),
        );
      case 'link':
        return Padding(
          padding: const EdgeInsets.all(16.0),
          child: InkWell(
            onTap: () {
              // Handle link tap
            },
            child: Text(
              section['text'] ?? 'Link',
              style: const TextStyle(
                color: Colors.blue,
                decoration: TextDecoration.underline,
              ),
            ),
          ),
        );
      default:
        return const SizedBox.shrink();
    }
  }

  IconData _getIconForPageType(String type) {
    switch (type) {
      case 'content':
        return Icons.article;
      case 'webview':
        return Icons.web;
      default:
        return Icons.pageview;
    }
  }
}
