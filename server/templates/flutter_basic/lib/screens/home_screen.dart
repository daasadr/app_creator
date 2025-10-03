import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../controllers/app_controller.dart';
import '../providers/auth_provider.dart';
import '../widgets/user_dashboard_widget.dart';
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
        title: Consumer<AuthProvider>(
          builder: (context, authProvider, _) {
            if (authProvider.isAuthenticated) {
              return Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  CircleAvatar(
                    radius: 14,
                    backgroundColor: Colors.white,
                    child: Icon(Icons.person,
                        size: 14, color: Theme.of(context).primaryColor),
                  ),
                  const SizedBox(width: 8),
                  Flexible(
                    child: Text(
                      authProvider.user?['displayName'] ?? 'Uživatel',
                      style: const TextStyle(fontSize: 16),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              );
            }
            return const Text(''); // Prázdný title
          },
        ),
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
                tooltip: controller.isOnline
                    ? 'Switch to offline'
                    : 'Switch to online',
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
      drawer: Consumer<AuthProvider>(
        builder: (context, authProvider, _) {
          if (authProvider.isAuthenticated) {
            return const UserDashboardWidget();
          }
          // Standardní drawer pro nepřihlášené uživatele
          return Consumer<AppController>(
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
                          const SizedBox(height: 20),
                          Row(
                            children: [
                              CircleAvatar(
                                radius: 25,
                                backgroundColor: Colors.white,
                                child: Icon(Icons.person,
                                    size: 25,
                                    color: Theme.of(context).primaryColor),
                              ),
                              const SizedBox(width: 12),
                              const Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Host',
                                      style: TextStyle(
                                        color: Colors.white,
                                        fontSize: 16,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    SizedBox(height: 2),
                                    Text(
                                      'Nepřihlášený uživatel',
                                      style: TextStyle(
                                        color: Colors.white70,
                                        fontSize: 12,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
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

    // Speciální zpracování pro login/register stránky
    if (type == 'login' || type == 'register') {
      return _buildAuthPageContent(page);
    }

    // Kontrola permissions - pouze content a webview mohou mít requireAuth
    final requireAuth = page['requireAuth'] == true;
    if (requireAuth) {
      return Consumer<AuthProvider>(
        builder: (context, authProvider, _) {
          if (!authProvider.isAuthenticated) {
            return _buildUnauthorizedContent(title, type);
          }
          // Pokračuj normálně s obsahem
          return _buildAuthorizedPageContent(page);
        },
      );
    }

    // Normální obsah bez auth requirements
    return _buildAuthorizedPageContent(page);
  }

  // Vytvoření obsahu pro autorizované uživatele
  Widget _buildAuthorizedPageContent(Map<String, dynamic> page) {
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

    // Obsahové stránky
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
                                const Icon(Icons.image,
                                    size: 64, color: Colors.grey),
                                if (alt.isNotEmpty) ...[
                                  const SizedBox(height: 8),
                                  Text(alt,
                                      style:
                                          const TextStyle(color: Colors.grey)),
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
                      return Align(
                          alignment: Alignment.centerLeft, child: imageWidget);
                    case 'right':
                      return Align(
                          alignment: Alignment.centerRight, child: imageWidget);
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
                        child: const Icon(Icons.image,
                            size: 64, color: Colors.grey),
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
    final offlineTitle =
        page['offlineTitle'] ?? page['title'] ?? 'Offline obsah';

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
    final type = block['type'] as String? ?? '';
    final requireAuth = block['requireAuth'] == true;

    // Pokud blok vyžaduje auth, zkontroluj přihlášení
    if (requireAuth) {
      return Consumer<AuthProvider>(
        builder: (context, authProvider, _) {
          if (!authProvider.isAuthenticated) {
            return _buildUnauthorizedBlock();
          }
          // Pokračuj normálně s blokem
          return _buildAuthorizedBlock(block, context);
        },
      );
    }

    // Zobraz blok normálně
    return _buildAuthorizedBlock(block, context);
  }

  Widget _buildAuthorizedBlock(
      Map<String, dynamic> block, BuildContext context) {
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
                      Text('Error loading image',
                          style: const TextStyle(
                              color: Colors.grey, fontSize: 12)),
                      if (alt.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        Text(alt, style: const TextStyle(color: Colors.grey)),
                      ],
                      const SizedBox(height: 4),
                      Text('URL: $url',
                          style: const TextStyle(
                              color: Colors.grey, fontSize: 10)),
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
        List<List<String>> data = [];
        try {
          print('Table block data type: ${block['data'].runtimeType}');
          print('Table block data: ${block['data']}');

          // Pokud je data JSON string, parsuj ho
          if (block['data'] is String) {
            print('Parsing data as JSON string');
            final parsedData = json.decode(block['data']);
            data = List<List<String>>.from(
                (parsedData as List).map((row) => List<String>.from(row)));
          } else {
            print('Parsing data as List');
            // Pokud je data už pole, použij ho přímo
            data = List<List<String>>.from(
                (block['data'] ?? []).map((row) => List<String>.from(row)));
          }
          print('Parsed table data: $data');
        } catch (e) {
          print('Error parsing table data: $e');
          data = [];
        }

        if (data.isEmpty) return const SizedBox.shrink();

        // Získej stylování z bloku
        final style = block['style'] ?? {};
        final borderWidth = (style['borderWidth'] ?? 1).toDouble();
        final borderColor = Color(int.parse(
            style['borderColor']?.replaceAll('#', '0xFF') ?? '0xFFE0E0E0'));
        final backgroundColor = style['backgroundColor'] != null
            ? Color(int.parse(style['backgroundColor'].replaceAll('#', '0xFF')))
            : Colors.transparent;
        final textColor = style['textColor'] != null
            ? Color(int.parse(style['textColor'].replaceAll('#', '0xFF')))
            : Colors.black;
        final fontSize = (style['fontSize'] ?? 14).toDouble();
        final fontWeight =
            style['fontWeight'] == 'bold' ? FontWeight.bold : FontWeight.normal;
        final borderRadius = (style['borderRadius'] ?? 8).toDouble();
        final padding = (style['padding'] ?? 8).toDouble();
        final margin = (style['margin'] ?? 0).toDouble();

        // Pokročilé border možnosti
        final showOuterBorder = style['showOuterBorder'] ?? true;
        final showInnerBorder = style['showInnerBorder'] ?? true;
        final borderType = style['borderType'] ?? 'all';

        // Urči, jaké border použít podle nastavení
        TableBorder? tableBorder;
        Border? containerBorder;

        if (borderType == 'none') {
          tableBorder = null;
          containerBorder = null;
        } else if (borderType == 'outer') {
          tableBorder = null;
          containerBorder = showOuterBorder
              ? Border.all(
                  color: borderColor,
                  width: borderWidth,
                )
              : null;
        } else if (borderType == 'inner') {
          tableBorder = showInnerBorder
              ? TableBorder.all(
                  color: borderColor,
                  width: borderWidth,
                )
              : null;
          containerBorder = null;
        } else {
          // 'all'
          tableBorder = showInnerBorder
              ? TableBorder.all(
                  color: borderColor,
                  width: borderWidth,
                )
              : null;
          containerBorder = showOuterBorder
              ? Border.all(
                  color: borderColor,
                  width: borderWidth,
                )
              : null;
        }

        // Vytvoř custom tabulku s pokročilým stylováním
        return Container(
          margin: EdgeInsets.all(margin),
          decoration: BoxDecoration(
            color: backgroundColor,
            borderRadius: BorderRadius.circular(borderRadius),
            border: containerBorder,
            boxShadow: style['boxShadow'] != null
                ? [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.1),
                      blurRadius: 4,
                      offset: const Offset(0, 2),
                    )
                  ]
                : null,
          ),
          child: Padding(
            padding: EdgeInsets.all(padding),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: DataTable(
                border: tableBorder,
                columns: data[0]
                    .map((cell) => DataColumn(
                          label: Text(
                            cell,
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: fontSize,
                              color: textColor,
                            ),
                          ),
                        ))
                    .toList(),
                rows: data
                    .skip(1)
                    .map((row) => DataRow(
                          cells: row
                              .map((cell) => DataCell(
                                    Text(
                                      cell,
                                      style: TextStyle(
                                        fontSize: fontSize,
                                        fontWeight: fontWeight,
                                        color: textColor,
                                      ),
                                    ),
                                  ))
                              .toList(),
                        ))
                    .toList(),
              ),
            ),
          ),
        );

      case 'mixed':
        final content = block['content'] ?? {};
        print('Mixed block content: $content');
        return Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Text obsah
              if (content['text'] != null &&
                  content['text'].toString().isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Text(
                    content['text'].toString(),
                    style: Theme.of(context).textTheme.bodyLarge,
                  ),
                ),

              // Obrázek
              if (content['image'] != null && content['image']['url'] != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: _buildImageFromContent(content['image'], context),
                ),

              // Tlačítko
              if (content['button'] != null &&
                  content['button']['text'] != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: ElevatedButton(
                    onPressed: () {
                      // Navigace podle URL nebo action
                      final url = content['button']['url'];
                      final action = content['button']['action'];
                      if (url != null) {
                        // Navigace na stránku podle URL
                        final pageIndex = _findPageByUrl(url);
                        if (pageIndex != -1) {
                          setState(() {
                            _currentPageIndex = pageIndex;
                            _showMenu = false;
                            _selectedTab = 1; // Domů
                          });
                        }
                      }
                    },
                    child: Text(content['button']['text'].toString()),
                  ),
                ),

              // Tabulka
              if (content['table'] != null && content['table']['data'] != null)
                _buildTableFromContent(content['table'], context),
            ],
          ),
        );

      default:
        return const SizedBox.shrink();
    }
  }

  // Pomocná funkce pro vykreslení obrázku z mixed bloku
  Widget _buildImageFromContent(
      Map<String, dynamic> imageContent, BuildContext context) {
    final url = imageContent['url'] ?? '';
    final alt = imageContent['alt'] ?? '';
    final align = imageContent['align'] ?? 'center';
    final width = (imageContent['width'] ?? 300).toDouble();

    if (url.isEmpty) return const SizedBox.shrink();

    Widget imageWidget = Container(
      width: width < 100
          ? MediaQuery.of(context).size.width * (width / 100)
          : width,
      margin: const EdgeInsets.symmetric(vertical: 8),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(8),
        child: url.startsWith('data:')
            ? Image.memory(
                base64Decode(url.split(',')[1]),
                fit: BoxFit.cover,
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
              )
            : Image.network(
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
  }

  // Pomocná funkce pro vykreslení tabulky z mixed bloku
  Widget _buildTableFromContent(
      Map<String, dynamic> tableContent, BuildContext context) {
    List<List<String>> data = [];
    try {
      // Pokud je data JSON string, parsuj ho
      if (tableContent['data'] is String) {
        final parsedData = json.decode(tableContent['data']);
        data = List<List<String>>.from(
            (parsedData as List).map((row) => List<String>.from(row)));
      } else {
        // Pokud je data už pole, použij ho přímo
        data = List<List<String>>.from(
            (tableContent['data'] ?? []).map((row) => List<String>.from(row)));
      }
    } catch (e) {
      print('Error parsing mixed table data: $e');
      data = [];
    }

    if (data.isEmpty) return const SizedBox.shrink();

    // Získej stylování z tableContent
    final style = tableContent['style'] ?? {};
    final borderWidth = (style['borderWidth'] ?? 1).toDouble();
    final borderColor = Color(int.parse(
        style['borderColor']?.replaceAll('#', '0xFF') ?? '0xFFE0E0E0'));
    final backgroundColor = style['backgroundColor'] != null
        ? Color(int.parse(style['backgroundColor'].replaceAll('#', '0xFF')))
        : Colors.transparent;
    final textColor = style['textColor'] != null
        ? Color(int.parse(style['textColor'].replaceAll('#', '0xFF')))
        : Colors.black;
    final fontSize = (style['fontSize'] ?? 14).toDouble();
    final fontWeight =
        style['fontWeight'] == 'bold' ? FontWeight.bold : FontWeight.normal;
    final borderRadius = (style['borderRadius'] ?? 8).toDouble();
    final padding = (style['padding'] ?? 8).toDouble();
    final margin = (style['margin'] ?? 0).toDouble();

    // Pokročilé border možnosti
    final showOuterBorder = style['showOuterBorder'] ?? true;
    final showInnerBorder = style['showInnerBorder'] ?? true;
    final borderType = style['borderType'] ?? 'all';

    // Urči, jaké border použít podle nastavení
    TableBorder? tableBorder;
    Border? containerBorder;

    if (borderType == 'none') {
      tableBorder = null;
      containerBorder = null;
    } else if (borderType == 'outer') {
      tableBorder = null;
      containerBorder = showOuterBorder
          ? Border.all(
              color: borderColor,
              width: borderWidth,
            )
          : null;
    } else if (borderType == 'inner') {
      tableBorder = showInnerBorder
          ? TableBorder.all(
              color: borderColor,
              width: borderWidth,
            )
          : null;
      containerBorder = null;
    } else {
      // 'all'
      tableBorder = showInnerBorder
          ? TableBorder.all(
              color: borderColor,
              width: borderWidth,
            )
          : null;
      containerBorder = showOuterBorder
          ? Border.all(
              color: borderColor,
              width: borderWidth,
            )
          : null;
    }

    // Vytvoř custom tabulku s pokročilým stylováním
    return Container(
      margin: EdgeInsets.all(margin),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(borderRadius),
        border: containerBorder,
        boxShadow: style['boxShadow'] != null
            ? [
                BoxShadow(
                  color: Colors.black.withOpacity(0.1),
                  blurRadius: 4,
                  offset: const Offset(0, 2),
                )
              ]
            : null,
      ),
      child: Padding(
        padding: EdgeInsets.all(padding),
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: DataTable(
            border: tableBorder,
            columns: data[0]
                .map((cell) => DataColumn(
                      label: Text(
                        cell,
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: fontSize,
                          color: textColor,
                        ),
                      ),
                    ))
                .toList(),
            rows: data
                .skip(1)
                .map((row) => DataRow(
                      cells: row
                          .map((cell) => DataCell(
                                Text(
                                  cell,
                                  style: TextStyle(
                                    fontSize: fontSize,
                                    fontWeight: fontWeight,
                                    color: textColor,
                                  ),
                                ),
                              ))
                          .toList(),
                    ))
                .toList(),
          ),
        ),
      ),
    );
  }

  // Pomocná funkce pro nalezení stránky podle URL
  int _findPageByUrl(String url) {
    final controller = context.read<AppController>();
    for (int i = 0; i < controller.pages.length; i++) {
      final page = controller.pages[i];
      if (page['title']?.toLowerCase() == url.toLowerCase() ||
          page['url'] == url) {
        return i;
      }
    }
    return -1;
  }

  // Speciální builder pro login/register stránky
  Widget _buildAuthPageContent(Map<String, dynamic> page) {
    final title = page['title'] ?? 'Untitled';
    final type = page['type'] ?? 'content';
    final content = page['content'] ?? '';
    final blocks = List<Map<String, dynamic>>.from(page['blocks'] ?? []);

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
          const SizedBox(height: 16),

          // Úvodní obsah ze stránky (obrázky, text, tabulky)
          if (blocks.isNotEmpty) ...[
            ...blocks.map((block) => _buildBlock(block, context)).toList(),
          ] else if (content.isNotEmpty) ...[
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.blue[50],
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.blue[200]!),
              ),
              child: Text(
                content,
                style: const TextStyle(fontSize: 16),
              ),
            ),
            const SizedBox(height: 24),
          ],

          // Auth formulář (login nebo register)
          if (type == 'login')
            _buildLoginForm()
          else if (type == 'register')
            _buildRegisterForm(),
        ],
      ),
    );
  }

  Widget _buildLoginForm() {
    return _AuthFormBuilder.buildLoginForm(context);
  }

  Widget _buildRegisterForm() {
    return _AuthFormBuilder.buildRegisterForm(context);
  }

  // Obsah pro nepřihlášené uživatele
  Widget _buildUnauthorizedContent(String title, String type) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [Colors.red[100]!, Colors.red[50]!],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.red[200]!),
            ),
            child: Column(
              children: [
                Icon(
                  Icons.lock,
                  size: 64,
                  color: Colors.red[600],
                ),
                const SizedBox(height: 16),
                Text(
                  '🔐 Přihlášení vyžadováno',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: Colors.red[800],
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  'Tato stránka "$title" je dostupná pouze pro přihlášené uživatele.',
                  style: TextStyle(
                    fontSize: 16,
                    color: Colors.red[700],
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 20),
                ElevatedButton.icon(
                  onPressed: () {
                    // Najdi login stránku a naviguj tam
                    final controller = context.read<AppController>();
                    for (int i = 0; i < controller.pages.length; i++) {
                      final page = controller.pages[i];
                      if (page['type'] == 'login') {
                        setState(() {
                          _currentPageIndex = i;
                          _showMenu = false;
                          _selectedTab = 1;
                        });
                        Navigator.pop(
                            context); // Zavři drawer pokud je otevřený
                        return;
                      }
                    }
                    // Pokud nenajdeš login stránku, zobraz obecný message
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                          content: Text('Přihlašovací stránka není nalezena')),
                    );
                  },
                  icon: const Icon(Icons.login),
                  label: const Text('Přihlásit se'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.red[600],
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(
                        horizontal: 24, vertical: 12),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // Blok pro nepřihlášené uživatele
  Widget _buildUnauthorizedBlock() {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.grey[100],
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.grey[300]!),
      ),
      child: Row(
        children: [
          Icon(Icons.lock_outline, color: Colors.grey[600], size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              'Obsah pouze pro přihlášené uživatele',
              style: TextStyle(
                color: Colors.grey[600],
                fontSize: 14,
                fontStyle: FontStyle.italic,
              ),
            ),
          ),
        ],
      ),
    );
  }

  IconData _getIconForType(String type) {
    switch (type) {
      case 'content':
        return Icons.article;
      case 'webview':
        return Icons.web;
      case 'login':
        return Icons.login;
      case 'register':
        return Icons.person_add;
      case 'form':
        return Icons.input;
      case 'list':
        return Icons.list;
      default:
        return Icons.pageview;
    }
  }
}

// Helper class pro vytváření auth formulářů
class _AuthFormBuilder {
  static Widget buildLoginForm(BuildContext context) {
    final emailController = TextEditingController();
    final passwordController = TextEditingController();

    return Consumer<AuthProvider>(
      builder: (context, authProvider, _) {
        return Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            boxShadow: [
              BoxShadow(
                color: Colors.grey.withOpacity(0.1),
                spreadRadius: 1,
                blurRadius: 6,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: Column(
            children: [
              const Text(
                'Přihlášení',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 20),
              TextField(
                controller: emailController,
                decoration: const InputDecoration(
                  labelText: 'Email',
                  prefixIcon: Icon(Icons.email),
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.emailAddress,
              ),
              const SizedBox(height: 16),
              TextField(
                controller: passwordController,
                decoration: const InputDecoration(
                  labelText: 'Heslo',
                  prefixIcon: Icon(Icons.lock),
                  border: OutlineInputBorder(),
                ),
                obscureText: true,
              ),
              const SizedBox(height: 20),
              if (authProvider.errorMessage != null)
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.red[50],
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.red[200]!),
                  ),
                  child: Text(
                    authProvider.errorMessage!,
                    style: TextStyle(color: Colors.red[800]),
                  ),
                ),
              if (authProvider.errorMessage != null) const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: authProvider.isLoading
                    ? const Center(child: CircularProgressIndicator())
                    : ElevatedButton(
                        onPressed: () async {
                          final success = await authProvider.signIn(
                            email: emailController.text.trim(),
                            password: passwordController.text.trim(),
                          );
                          if (success) {
                            emailController.clear();
                            passwordController.clear();
                          }
                        },
                        child: const Text('Přihlásit se'),
                      ),
              ),
              const SizedBox(height: 12),
              TextButton(
                onPressed: () {
                  // TODO: Implement forgot password
                },
                child: const Text('Zapomněli jste heslo?'),
              ),
            ],
          ),
        );
      },
    );
  }

  static Widget buildRegisterForm(BuildContext context) {
    final nameController = TextEditingController();
    final emailController = TextEditingController();
    final passwordController = TextEditingController();

    return Consumer<AuthProvider>(
      builder: (context, authProvider, _) {
        return Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            boxShadow: [
              BoxShadow(
                color: Colors.grey.withOpacity(0.1),
                spreadRadius: 1,
                blurRadius: 6,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: Column(
            children: [
              const Text(
                'Registrace',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 20),
              TextField(
                controller: nameController,
                decoration: const InputDecoration(
                  labelText: 'Jméno',
                  prefixIcon: Icon(Icons.person),
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: emailController,
                decoration: const InputDecoration(
                  labelText: 'Email',
                  prefixIcon: Icon(Icons.email),
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.emailAddress,
              ),
              const SizedBox(height: 16),
              TextField(
                controller: passwordController,
                decoration: const InputDecoration(
                  labelText: 'Heslo',
                  prefixIcon: Icon(Icons.lock),
                  border: OutlineInputBorder(),
                ),
                obscureText: true,
              ),
              const SizedBox(height: 20),
              if (authProvider.errorMessage != null)
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.red[50],
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.red[200]!),
                  ),
                  child: Text(
                    authProvider.errorMessage!,
                    style: TextStyle(color: Colors.red[800]),
                  ),
                ),
              if (authProvider.errorMessage != null) const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: authProvider.isLoading
                    ? const Center(child: CircularProgressIndicator())
                    : ElevatedButton(
                        onPressed: () async {
                          final success = await authProvider.register(
                            email: emailController.text.trim(),
                            password: passwordController.text.trim(),
                            displayName: nameController.text.trim(),
                          );
                          if (success) {
                            nameController.clear();
                            emailController.clear();
                            passwordController.clear();
                          }
                        },
                        child: const Text('Registrovat se'),
                      ),
              ),
              const SizedBox(height: 12),
              TextButton(
                onPressed: () {
                  // Navigate to login page
                  // TODO: Find and navigate to login page
                },
                child: const Text('Máte již účet? Přihlaste se'),
              ),
            ],
          ),
        );
      },
    );
  }
}
