import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart' as app_auth;

class UserDashboardWidget extends StatefulWidget {
  const UserDashboardWidget({super.key});

  @override
  State<UserDashboardWidget> createState() => _UserDashboardWidgetState();
}

class _UserDashboardWidgetState extends State<UserDashboardWidget> {
  bool _isEditingProfile = false;
  final _nameController = TextEditingController();

  @override
  void initState() {
    super.initState();
    final authProvider = Provider.of<app_auth.AuthProvider>(context, listen: false);
    final user = authProvider.user;
    if (user != null) {
      _nameController.text = user['displayName'] ?? '';
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<app_auth.AuthProvider>(context);
    final user = authProvider.user;

    if (user == null) return const SizedBox.shrink();

    return Drawer(
      child: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Colors.blue, Colors.purple],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              // User header
              Container(
                padding: const EdgeInsets.all(20),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 35,
                      backgroundColor: Colors.white,
                      child: Icon(
                        Icons.person,
                        color: Colors.blue,
                        size: 35,
                      ),
                    ),
                    const SizedBox(width: 15),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (_isEditingProfile) ...[
                            TextField(
                              controller: _nameController,
                              style: const TextStyle(color: Colors.white),
                              decoration: InputDecoration(
                                labelText: 'Jméno',
                                labelStyle: TextStyle(color: Colors.white.withOpacity(0.8)),
                                enabledBorder: OutlineInputBorder(
                                  borderSide: BorderSide(color: Colors.white.withOpacity(0.3)),
                                ),
                                focusedBorder: const OutlineInputBorder(
                                  borderSide: BorderSide(color: Colors.white),
                                ),
                              ),
                            ),
                          ] else ...[
                            Text(
                              user['displayName'] ?? 'Bez jména',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 4),
                            Text(
                              user['email'] ?? '',
                              style: TextStyle(
                                color: Colors.white.withOpacity(0.8),
                                fontSize: 14,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ],
                      ),
                    ),
                    if (_isEditingProfile)
                      IconButton(
                        onPressed: () {
                          setState(() {
                            _isEditingProfile = false;
                          });
                        },
                        icon: const Icon(Icons.close, color: Colors.white),
                      )
                    else
                      IconButton(
                        onPressed: () {
                          setState(() {
                            _isEditingProfile = true;
                          });
                        },
                        icon: const Icon(Icons.edit, color: Colors.white),
                      ),
                  ],
                ),
              ),
              
              if (_isEditingProfile) ...[
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Row(
                    children: [
                      Expanded(
                        child: ElevatedButton(
                          onPressed: () => _updateProfile(authProvider),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.white,
                            foregroundColor: Colors.blue,
                          ),
                          child: const Text('Uložit'),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
              ],

              // Navigation items
              Expanded(
                child: Container(
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.only(
                      topLeft: Radius.circular(20),
                      topRight: Radius.circular(20),
                    ),
                  ),
                  child: ListView(
                    padding: const EdgeInsets.only(top: 20),
                    children: [
                      // User info section
                      _buildMenuItem(
                        icon: Icons.person_outline,
                        title: 'Profil',
                        subtitle: 'Upravte své osobní údaje',
                        onTap: () => setState(() => _isEditingProfile = true),
                      ),
                      
                      _buildMenuItem(
                        icon: Icons.notifications_outlined,
                        title: 'Notifikace',
                        subtitle: 'Nastavení oznámení',
                        onTap: () => _showNotificationsSettings(),
                      ),
                      
                      _buildMenuItem(
                        icon: Icons.privacy_tip_outlined,
                        title: 'Soukromí',
                        subtitle: 'Nastavení soukromí',
                        onTap: () => _showPrivacySettings(),
                      ),
                      
                      const Divider(),
                      
                      _buildMenuItem(
                        icon: Icons.help_outline,
                        title: 'Nápověda',
                        subtitle: 'Potřebujete pomoc?',
                        onTap: () => _showHelp(),
                      ),
                      
                      _buildMenuItem(
                        icon: Icons.info_outline,
                        title: 'O aplikaci',
                        subtitle: 'Informace o verzí',
                        onTap: () => _showAbout(),
                      ),
                      
                      const Divider(),
                      
                      // Sign out button
                      ListTile(
                        leading: Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: Colors.red.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Icon(
                            Icons.logout,
                            color: Colors.red[600],
                            size: 24,
                          ),
                        ),
                        title: Text(
                          'Odhlásit se',
                          style: TextStyle(
                            color: Colors.red[600],
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        onTap: () => _showLogoutConfirmation(authProvider),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMenuItem({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return ListTile(
      leading: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: Colors.blue.withOpacity(0.1),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(icon, color: Colors.blue[600], size: 24),
      ),
      title: Text(
        title,
        style: const TextStyle(
          fontWeight: FontWeight.w600,
          fontSize: 16,
        ),
      ),
      subtitle: Text(
        subtitle,
        style: TextStyle(
          color: Colors.grey[600],
          fontSize: 13,
        ),
      ),
      onTap: onTap,
      trailing: const Icon(Icons.arrow_forward_ios, size: 16),
    );
  }

  void _updateProfile(app_auth.AuthProvider authProvider) async {
    if (_nameController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Jméno nemůže být prázdné')),
      );
      return;
    }

    final success = await authProvider.updateProfile(
      displayName: _nameController.text.trim(),
    );

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Profil byl úspěšně aktualizován')),
      );
      setState(() {
        _isEditingProfile = false;
      });
    } else if (authProvider.errorMessage != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(authProvider.errorMessage!)),
      );
    }
  }

  void _showLogoutConfirmation(app_auth.AuthProvider authProvider) {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('Odhlásit se'),
          content: const Text('Opravdu se chcete odhlásit?'),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Zrušit'),
            ),
            ElevatedButton(
              onPressed: () async {
                Navigator.of(context).pop();
                await authProvider.signOut();
                // Navigate back to auth screen if needed
                Navigator.of(context).pushReplacementNamed('/');
              },
              child: const Text('Odhlásit'),
            ),
          ],
        );
      },
    );
  }

  void _showNotificationsSettings() {
    _showFeatureDialog('Nastavení notifikací', 'Toto nastavení bude dostupné v budoucí verzi.');
  }

  void _showPrivacySettings() {
    _showFeatureDialog('Nastavení soukromí', 'Toto nastavení bude dostupné v budoucí verzi.');
  }

  void _showHelp() {
    _showFeatureDialog('Nápověda', 'Pro více informací kontaktujte administrátora aplikace.');
  }

  void _showAbout() {
    _showFeatureDialog('O aplikaci', 'Tato aplikace byla vygenerována pomocí App Generator.');
  }

  void _showFeatureDialog(String title, String message) {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: Text(title),
          content: Text(message),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('OK'),
            ),
          ],
        );
      },
    );
  }
}