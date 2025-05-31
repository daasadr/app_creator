import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Template App',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
        useMaterial3: true,
      ),
      home: const ConfigurableHomePage(),
    );
  }
}

class AppConfig {
  final String appName;
  final ThemeData theme;
  final List<PageConfig> pages;
  final Map<String, dynamic> settings;

  AppConfig({
    required this.appName,
    required this.theme,
    required this.pages,
    required this.settings,
  });

  factory AppConfig.fromJson(Map<String, dynamic> json) {
    return AppConfig(
      appName: json['appName'] as String,
      theme: _parseTheme(json['theme'] as Map<String, dynamic>),
      pages: (json['pages'] as List).map((e) => PageConfig.fromJson(e)).toList(),
      settings: json['settings'] as Map<String, dynamic>,
    );
  }

  static ThemeData _parseTheme(Map<String, dynamic> theme) {
    return ThemeData(
      colorScheme: ColorScheme.fromSeed(
        seedColor: Color(int.parse(theme['primaryColor'] as String)),
      ),
      useMaterial3: true,
    );
  }
}

class PageConfig {
  final String title;
  final String type;
  final Map<String, dynamic> content;

  PageConfig({
    required this.title,
    required this.type,
    required this.content,
  });

  factory PageConfig.fromJson(Map<String, dynamic> json) {
    return PageConfig(
      title: json['title'] as String,
      type: json['type'] as String,
      content: json['content'] as Map<String, dynamic>,
    );
  }
}

class ConfigurableHomePage extends StatefulWidget {
  const ConfigurableHomePage({super.key});

  @override
  State<ConfigurableHomePage> createState() => _ConfigurableHomePageState();
}

class _ConfigurableHomePageState extends State<ConfigurableHomePage> {
  AppConfig? _config;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadConfig();
  }

  Future<void> _loadConfig() async {
    try {
      final String configJson = await rootBundle.loadString('assets/config.json');
      final config = AppConfig.fromJson(json.decode(configJson));
      setState(() {
        _config = config;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(),
        ),
      );
    }

    if (_error != null) {
      return Scaffold(
        body: Center(
          child: Text('Error: $_error'),
        ),
      );
    }

    final config = _config!;
    final pages = config.pages;

    return Scaffold(
      appBar: AppBar(
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
        title: Text(config.appName),
      ),
      body: PageView.builder(
        itemCount: pages.length,
        itemBuilder: (context, index) {
          final page = pages[index];
          return _buildPage(page);
        },
      ),
    );
  }

  Widget _buildPage(PageConfig page) {
    switch (page.type) {
      case 'list':
        return _buildListPage(page);
      case 'grid':
        return _buildGridPage(page);
      case 'detail':
        return _buildDetailPage(page);
      default:
        return Center(
          child: Text('Unknown page type: ${page.type}'),
        );
    }
  }

  Widget _buildListPage(PageConfig page) {
    final items = page.content['items'] as List;
    return ListView.builder(
      itemCount: items.length,
      itemBuilder: (context, index) {
        final item = items[index];
        return ListTile(
          title: Text(item['title']),
          subtitle: Text(item['description']),
          onTap: () {
            // Handle item tap
          },
        );
      },
    );
  }

  Widget _buildGridPage(PageConfig page) {
    final items = page.content['items'] as List;
    return GridView.builder(
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        childAspectRatio: 1.0,
      ),
      itemCount: items.length,
      itemBuilder: (context, index) {
        final item = items[index];
        return Card(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (item['imageUrl'] != null)
                Image.network(
                  item['imageUrl'],
                  height: 100,
                  width: 100,
                  fit: BoxFit.cover,
                ),
              Text(item['title']),
            ],
          ),
        );
      },
    );
  }

  Widget _buildDetailPage(PageConfig page) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            page.content['title'],
            style: Theme.of(context).textTheme.headlineMedium,
          ),
          const SizedBox(height: 16),
          if (page.content['imageUrl'] != null)
            Image.network(page.content['imageUrl']),
          const SizedBox(height: 16),
          Text(page.content['description']),
        ],
      ),
    );
  }
}
