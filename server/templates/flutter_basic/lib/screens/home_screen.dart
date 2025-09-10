import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../controllers/app_controller.dart';
import 'dart:convert';
import 'menu_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentPageIndex = 0;
  int _selectedTab = 1; // 0 = zpět, 1 = domů, 2 = menu
  bool _showMenu = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AppController>().loadAppContent();
    });
  }

  void _onBottomNavTap(int index) {
    setState(() {
      if (index == 0) {
        // Zpět
        if (_showMenu) {
          _showMenu = false;
        } else if (_currentPageIndex > 0) {
          _currentPageIndex--;
        }
      } else if (index == 1) {
        // Domů
        _showMenu = false;
        _currentPageIndex = 0;
      } else if (index == 2) {
        // Menu
        _showMenu = true;
      }
      _selectedTab = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(''), // Prázdný title
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
        automaticallyImplyLeading: true, // Zobrazí hamburger menu (čtvereček)
        actions: [
          // Tlačítko pro testování offline režimu
          Consumer<AppController>(
            builder: (context, controller, child) {
              return IconButton(
                icon: Icon(controller.isOnline ? Icons.wifi : Icons.wifi_off),
                onPressed: () {
                  controller.setOfflineMode(controller.isOnline);
                },
                tooltip: controller.isOnline ? 'Switch to offline' : 'Switch to online',
              );
            },
          ),
          // Tlačítko pro refresh obsahu z Firestore
          Consumer<AppController>(
            builder: (context, controller, child) {
              return IconButton(
                icon: const Icon(Icons.refresh),
                onPressed: () async {
                  await controller.refreshContent();
                },
                tooltip: 'Refresh content',
              );
            },
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
                        controller.appSettings['appName'] ?? 'Aplikace',
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
                        _showMenu = false;
                        _selectedTab = 1;
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
      body: _showMenu
          ? MenuScreen(
              pages: context.watch<AppController>().pages,
              onTileTap: (index) {
                setState(() {
                  _currentPageIndex = index;
                  _showMenu = false;
                  _selectedTab = 1;
                });
              },
            )
          : Consumer<AppController>(
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
                final currentPage = controller.pages[_currentPageIndex];
                return _buildPageContent(currentPage);
              },
            ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _selectedTab,
        onTap: _onBottomNavTap,
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.arrow_back), label: 'Zpět'),
          BottomNavigationBarItem(icon: Icon(Icons.home), label: 'Domů'),
          BottomNavigationBarItem(icon: Icon(Icons.menu), label: 'Menu'),
        ],
      ),
    );
  }

  Widget _buildPageContent(Map<String, dynamic> page) {
    final title = page['title'] ?? 'Untitled';
    final type = page['type'] ?? 'content';
    final content = page['content'] ?? '';
    final richContent = page['richContent'] ?? content;
    final url = page['url'] ?? '';
    final imageUrl = page['imageUrl'] ?? '';
    final images = List<Map<String, dynamic>>.from(page['images'] ?? []);
    final blocks = List<Map<String, dynamic>>.from(page['blocks'] ?? []);

    // Pro webview fullscreen bez nadpisu a bez URL
    if (type == 'webview' && url.isNotEmpty) {
      return Consumer<AppController>(
        builder: (context, controller, child) {
          // Zkontroluj online stav
          if (!controller.isOnline) {
            // Offline režim - zobraz fallback obsah
            return _buildOfflineWebViewContent(page);
          }
          
          // Online režim - zobraz webview
          return SizedBox.expand(
            child: WebViewWidget(
              controller: WebViewController()
                ..setJavaScriptMode(JavaScriptMode.unrestricted)
                ..loadRequest(Uri.parse(url))
                ..setNavigationDelegate(
                  NavigationDelegate(
                    onProgress: (int progress) {},
                    onPageStarted: (String url) {},
                    onPageFinished: (String url) {},
                    onWebResourceError: (WebResourceError error) {},
                  ),
                ),
            ),
          );
        },
      );
    }

    // Ostatní typy zůstávají stejné
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Nadpis stránky (ne pro webview)
          Text(
            title,
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 24),
          // Obsah podle typu
          if (type == 'content') ...[
            // Zobrazení bloků v pořadí podle blocks pole
            if (blocks.isNotEmpty) ...[
              ...blocks.map((block) => _buildBlock(block, context)).toList(),
            ] else ...[
              // Fallback na starý způsob - zobrazit rich content nebo prostý text
              if (richContent.isNotEmpty && richContent != content) ...[
                // Rich content s HTML - použijeme WebView pro zobrazení HTML
                Container(
                  height: 400, // Výška pro HTML obsah
                  child: WebViewWidget(
                    controller: WebViewController()
                      ..setJavaScriptMode(JavaScriptMode.unrestricted)
                      ..loadHtmlString('''
                        <!DOCTYPE html>
                        <html>
                        <head>
                          <meta name="viewport" content="width=device-width, initial-scale=1.0">
                          <style>
                            body {
                              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                              font-size: 16px;
                              line-height: 1.5;
                              margin: 0;
                              padding: 16px;
                              color: #333;
                            }
                            p { margin-bottom: 16px; }
                            h1 { font-size: 24px; font-weight: bold; margin: 24px 0 16px 0; }
                            h2 { font-size: 20px; font-weight: bold; margin: 20px 0 12px 0; }
                            h3 { font-size: 18px; font-weight: bold; margin: 16px 0 10px 0; }
                            table { border-collapse: collapse; width: 100%; margin: 16px 0; }
                            td, th { border: 1px solid #ccc; padding: 8px; text-align: left; }
                            th { font-weight: bold; background-color: #f5f5f5; }
                            img { max-width: 100%; height: auto; margin: 8px 0; }
                            ul, ol { margin-bottom: 16px; }
                            li { margin-bottom: 4px; }
                            a { color: #007AFF; text-decoration: underline; }
                            blockquote { 
                              border-left: 4px solid #ccc; 
                              padding-left: 16px; 
                              margin: 16px 0; 
                              font-style: italic; 
                            }
                            /* Vylepšené styly pro tabulky */
                            table { 
                              border-collapse: collapse; 
                              width: 100%; 
                              margin: 16px 0; 
                              font-size: 14px;
                              overflow-x: auto;
                              display: block;
                            }
                            td, th { 
                              border: 1px solid #ccc; 
                              padding: 12px 8px; 
                              text-align: left; 
                              vertical-align: top;
                              word-wrap: break-word;
                              max-width: 200px;
                            }
                            th { 
                              font-weight: bold; 
                              background-color: #f5f5f5; 
                              position: sticky;
                              top: 0;
                            }
                            /* Responsivní tabulky */
                            @media (max-width: 600px) {
                              table { font-size: 12px; }
                              td, th { padding: 8px 4px; }
                            }
                          </style>
                        </head>
                        <body>
                          ${richContent}
                        </body>
                        </html>
                      '''),
                  ),
                ),
              ] else if (content.isNotEmpty) ...[
                // Fallback na prostý text
                Text(
                  content,
                  style: Theme.of(context).textTheme.bodyLarge,
                ),
              ],
              // Zobrazení obrázků z images pole
              if (images.isNotEmpty) ...[
                ...images.map((image) {
                  final imageUrl = image['url'] ?? '';
                  final alt = image['alt'] ?? '';
                  final width = (image['width'] ?? 300).toDouble();
                  final position = image['position'] ?? 'center';
                  
                  if (imageUrl.isEmpty) return const SizedBox.shrink();
                  
                  Widget imageWidget = Container(
                    width: width < 100
                        ? MediaQuery.of(context).size.width * (width / 100)
                        : width,
                    margin: const EdgeInsets.symmetric(vertical: 8),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: Image.network(
                        imageUrl,
                        fit: BoxFit.cover,
                        loadingBuilder: (context, child, loadingProgress) {
                          if (loadingProgress == null) return child;
                          return Container(
                            height: 200,
                            color: Colors.grey[200],
                            child: const Center(
                              child: CircularProgressIndicator(),
                            ),
                          );
                        },
                        errorBuilder: (context, error, stackTrace) {
                          return Container(
                            height: 200,
                            color: Colors.grey[300],
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(Icons.image, size: 64, color: Colors.grey),
                                if (alt.isNotEmpty) ...[
                                  const SizedBox(height: 8),
                                  Text(alt, style: const TextStyle(color: Colors.grey)),
                                ],
                              ],
                            ),
                          );
                        },
                      ),
                    ),
                  );
                  
                  // Aplikace pozice
                  switch (position) {
                    case 'left':
                      return Align(alignment: Alignment.centerLeft, child: imageWidget);
                    case 'right':
                      return Align(alignment: Alignment.centerRight, child: imageWidget);
                    case 'center':
                    default:
                      return Center(child: imageWidget);
                  }
                }).toList(),
              ],
              // Kompatibilita se starým způsobem (jediný obrázek)
              if (images.isEmpty && imageUrl.isNotEmpty) ...[
                Center(
                  child: Image.network(
                    imageUrl,
                    height: 200,
                    width: double.infinity,
                    fit: BoxFit.cover,
                    loadingBuilder: (context, child, loadingProgress) {
                      if (loadingProgress == null) return child;
                      return Container(
                        height: 200,
                        width: double.infinity,
                        color: Colors.grey[200],
                        child: const Center(
                          child: CircularProgressIndicator(),
                        ),
                      );
                    },
                    errorBuilder: (context, error, stackTrace) {
                      return Container(
                        height: 200,
                        width: double.infinity,
                        color: Colors.grey[300],
                        child:
                            const Icon(Icons.image, size: 64, color: Colors.grey),
                      );
                    },
                  ),
                ),
                const SizedBox(height: 16),
              ],
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

  // Offline obsah pro webview stránky
  Widget _buildOfflineWebViewContent(Map<String, dynamic> page) {
    final offlineContent = page['offlineContent'] ?? '';
    final offlineTitle = page['offlineTitle'] ?? page['title'] ?? 'Offline obsah';
    
    print('Offline content debug:');
    print('  offlineContent: "$offlineContent"');
    print('  offlineTitle: "$offlineTitle"');
    print('  page keys: ${page.keys.toList()}');
    
    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Offline banner
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            color: Colors.orange[100],
            child: Row(
              children: [
                Icon(Icons.wifi_off, color: Colors.orange[800], size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Offline režim - připojte se k internetu pro aktuální obsah',
                    style: TextStyle(
                      color: Colors.orange[800],
                      fontWeight: FontWeight.w500,
                      fontSize: 14,
                    ),
                  ),
                ),
              ],
            ),
          ),
          
          // Offline nadpis
          Padding(
            padding: const EdgeInsets.all(16),
            child: Text(
              offlineTitle,
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          
          // Offline obsah
          if (offlineContent.isNotEmpty) ...[
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.grey[50],
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.grey[300]!),
                ),
                child: WebViewWidget(
                  controller: WebViewController()
                    ..setJavaScriptMode(JavaScriptMode.unrestricted)
                    ..loadHtmlString('''
                      <!DOCTYPE html>
                      <html>
                      <head>
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <style>
                          body {
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                            font-size: 16px;
                            line-height: 1.5;
                            margin: 0;
                            padding: 0;
                            color: #333;
                          }
                          p { margin-bottom: 16px; }
                          h1 { font-size: 24px; font-weight: bold; margin: 24px 0 16px 0; }
                          h2 { font-size: 20px; font-weight: bold; margin: 20px 0 12px 0; }
                          h3 { font-size: 18px; font-weight: bold; margin: 16px 0 10px 0; }
                          img { max-width: 100%; height: auto; margin: 8px 0; }
                          ul, ol { margin-bottom: 16px; }
                          li { margin-bottom: 4px; }
                          a { color: #007AFF; text-decoration: underline; }
                        </style>
                      </head>
                      <body>
                        $offlineContent
                      </body>
                      </html>
                    '''),
                ),
              ),
            ),
          ] else ...[
            // Žádný offline obsah
            Padding(
              padding: const EdgeInsets.all(16),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: Colors.grey[100],
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.grey[300]!),
                ),
                child: Column(
                  children: [
                    Icon(Icons.info_outline, size: 48, color: Colors.grey[600]),
                    const SizedBox(height: 16),
                    Text(
                      'Žádný offline obsah',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w500,
                        color: Colors.grey[700],
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Pro zobrazení obsahu se připojte k internetu.',
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey[600],
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            ),
          ],
          
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  // Metoda pro zobrazení jednotlivých bloků
  Widget _buildBlock(Map<String, dynamic> block, BuildContext context) {
    final type = block['type'] ?? '';
    
    switch (type) {
      case 'text':
        final content = block['content'] ?? '';
        if (content.isEmpty) return const SizedBox.shrink();
        
        return Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Text(
            content,
            style: Theme.of(context).textTheme.bodyLarge,
          ),
        );
        
      case 'image':
        final url = block['url'] ?? '';
        final alt = block['alt'] ?? '';
        final align = block['align'] ?? 'center';
        final width = (block['width'] ?? 300).toDouble();
        
        if (url.isEmpty) return const SizedBox.shrink();
        
        Widget imageWidget = Container(
          width: width < 100
              ? MediaQuery.of(context).size.width * (width / 100)
              : width,
          margin: const EdgeInsets.symmetric(vertical: 8),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: Image.network(
              url,
              fit: BoxFit.cover,
              loadingBuilder: (context, child, loadingProgress) {
                if (loadingProgress == null) return child;
                return Container(
                  height: 200,
                  color: Colors.grey[200],
                  child: const Center(
                    child: CircularProgressIndicator(),
                  ),
                );
              },
              errorBuilder: (context, error, stackTrace) {
                print('Image load error for URL: $url');
                print('Error: $error');
                return Container(
                  height: 200,
                  color: Colors.grey[300],
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.image, size: 64, color: Colors.grey),
                      Text('Error loading image', style: const TextStyle(color: Colors.grey, fontSize: 12)),
                      if (alt.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        Text(alt, style: const TextStyle(color: Colors.grey)),
                      ],
                      const SizedBox(height: 4),
                      Text('URL: $url', style: const TextStyle(color: Colors.grey, fontSize: 10)),
                    ],
                  ),
                );
              },
            ),
          ),
        );
        
        // Aplikace pozice
        switch (align) {
          case 'left':
            return Align(alignment: Alignment.centerLeft, child: imageWidget);
          case 'right':
            return Align(alignment: Alignment.centerRight, child: imageWidget);
          case 'full':
            return SizedBox(width: double.infinity, child: imageWidget);
          case 'center':
          default:
            return Center(child: imageWidget);
        }
        
      case 'table':
        final data = List<List<String>>.from(
          (block['data'] ?? []).map((row) => List<String>.from(row))
        );
        
        if (data.isEmpty) return const SizedBox.shrink();
        
        return Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: DataTable(
              columns: data.isNotEmpty 
                  ? data[0].map((cell) => DataColumn(label: Text(cell))).toList()
                  : [],
              rows: data.length > 1 
                  ? data.skip(1).map((row) => DataRow(
                      cells: row.map((cell) => DataCell(Text(cell))).toList()
                    )).toList()
                  : [],
            ),
          ),
        );
        
      default:
        return const SizedBox.shrink();
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
