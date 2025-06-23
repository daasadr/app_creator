import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:get/get.dart';
import '../controllers/app_controller.dart';
import 'dart:convert';

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
          IconButton(
            icon: const Icon(Icons.admin_panel_settings),
            onPressed: () => Get.toNamed('/admin'),
          ),
        ],
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

          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: controller.pages.length,
            itemBuilder: (context, index) {
              final page = controller.pages[index];
              return _buildPageCard(page, index);
            },
          );
        },
      ),
    );
  }

  Widget _buildPageCard(Map<String, dynamic> page, int index) {
    final title = page['title'] ?? 'Untitled';
    final type = page['type'] ?? 'content';
    final content = page['content'] ?? '';

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  _getIconForType(type),
                  color: Theme.of(context).primaryColor,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    title,
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            if (type == 'content') ...[
              Text(
                content,
                style: Theme.of(context).textTheme.bodyMedium,
              ),
            ] else if (type == 'form') ...[
              _buildFormPreview(content),
            ] else if (type == 'list') ...[
              _buildListPreview(content),
            ],
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton(
                  onPressed: () {
                    // Navigate to page detail or edit
                    Get.toNamed('/admin');
                  },
                  child: const Text('Edit'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFormPreview(String content) {
    try {
      final formData = Map<String, dynamic>.from(json.decode(content));
      final fields = List<Map<String, dynamic>>.from(formData['fields'] ?? []);

      return Column(
        children: fields.take(3).map((field) {
          final label = field['label'] ?? 'Field';
          final type = field['type'] ?? 'text';

          return Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Row(
              children: [
                Icon(
                  _getFieldIcon(type),
                  size: 16,
                  color: Colors.grey,
                ),
                const SizedBox(width: 8),
                Text('$label (${type})'),
              ],
            ),
          );
        }).toList(),
      );
    } catch (e) {
      return Text('Form: $content');
    }
  }

  Widget _buildListPreview(String content) {
    try {
      final listData = Map<String, dynamic>.from(json.decode(content));
      final items = List<String>.from(listData['items'] ?? []);

      return Column(
        children: items.take(3).map((item) {
          return Padding(
            padding: const EdgeInsets.only(bottom: 4),
            child: Row(
              children: [
                const Icon(Icons.arrow_right, size: 16, color: Colors.grey),
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
      case 'form':
        return Icons.input;
      case 'list':
        return Icons.list;
      default:
        return Icons.pageview;
    }
  }

  IconData _getFieldIcon(String type) {
    switch (type) {
      case 'text':
        return Icons.text_fields;
      case 'email':
        return Icons.email;
      case 'number':
        return Icons.numbers;
      case 'date':
        return Icons.calendar_today;
      default:
        return Icons.input;
    }
  }
}
