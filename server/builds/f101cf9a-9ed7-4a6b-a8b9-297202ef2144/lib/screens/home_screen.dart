import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../controllers/app_controller.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _selectedIndex = 0;

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
        final error = controller.error;
        final isLoading = controller.isLoading;

        if (error != null) {
          return Scaffold(
            appBar: AppBar(
              title: Text(
                  settings['appName'] ?? settings['description'] ?? 'Aplikace'),
            ),
            body: Center(
              child: Text(
                'Chyba při načítání obsahu:\n$error',
                style: const TextStyle(color: Colors.red),
                textAlign: TextAlign.center,
              ),
            ),
          );
        }

        return Scaffold(
          appBar: AppBar(
            title: Text(
                settings['appName'] ?? settings['description'] ?? 'Aplikace'),
          ),
          body: isLoading
              ? const Center(child: CircularProgressIndicator())
              : pages.isEmpty
                  ? const Center(child: Text('Žádné stránky k zobrazení'))
                  : _buildPageContent(pages[_selectedIndex]),
          bottomNavigationBar: pages.length > 1
              ? BottomNavigationBar(
                  currentIndex: _selectedIndex,
                  items: pages.map((page) {
                    return BottomNavigationBarItem(
                      icon: Icon(_getIconForPageType(page['type'])),
                      label: page['title'] ?? 'Page',
                    );
                  }).toList(),
                  onTap: (index) {
                    setState(() {
                      _selectedIndex = index;
                    });
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
        return SingleChildScrollView(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (page['imageUrl'] != null &&
                  page['imageUrl'].toString().isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(bottom: 16.0),
                  child: Image.network(page['imageUrl']),
                ),
              if (page['title'] != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8.0),
                  child: Text(
                    page['title'],
                    style: const TextStyle(
                        fontSize: 24, fontWeight: FontWeight.bold),
                  ),
                ),
              if (page['content'] != null)
                Text(
                  page['content'],
                  style: const TextStyle(fontSize: 16),
                ),
            ],
          ),
        );
      case 'webview':
        return Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (page['title'] != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8.0),
                  child: Text(
                    page['title'],
                    style: const TextStyle(
                        fontSize: 24, fontWeight: FontWeight.bold),
                  ),
                ),
              if (page['url'] != null)
                Padding(
                  padding: const EdgeInsets.all(8.0),
                  child: Text(
                    page['url'],
                    style: const TextStyle(fontSize: 14, color: Colors.blue),
                  ),
                ),
              const SizedBox(height: 16),
              const Text('WebView není na této platformě podporován.'),
            ],
          ),
        );
      default:
        return const Center(child: Text('Unknown page type'));
    }
  }

  IconData _getIconForPageType(String? type) {
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
