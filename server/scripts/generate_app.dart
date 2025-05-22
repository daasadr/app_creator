import 'dart:io';
import 'package:path/path.dart' as path;
import 'package:yaml/yaml.dart';

class AppGenerator {
  final String templatePath;
  final String outputPath;
  final Map<String, dynamic> config;

  AppGenerator({
    required this.templatePath,
    required this.outputPath,
    required this.config,
  });

  Future<void> generate() async {
    try {
      // Create output directory
      await Directory(outputPath).create(recursive: true);

      // Copy template files
      await _copyTemplateFiles();

      // Update pubspec.yaml
      await _updatePubspec();

      // Update app configuration
      await _updateAppConfig();

      // Generate platform-specific files
      await _generatePlatformFiles();

      print('App generated successfully at: $outputPath');
    } catch (e) {
      print('Error generating app: $e');
      rethrow;
    }
  }

  Future<void> _copyTemplateFiles() async {
    final templateDir = Directory(templatePath);
    await for (final entity in templateDir.list(recursive: true)) {
      if (entity is File) {
        final relativePath = path.relative(entity.path, from: templatePath);
        final targetPath = path.join(outputPath, relativePath);
        await entity.copy(targetPath);
      }
    }
  }

  Future<void> _updatePubspec() async {
    final pubspecPath = path.join(outputPath, 'pubspec.yaml');
    final pubspecFile = File(pubspecPath);
    final pubspecContent = await pubspecFile.readAsString();
    final pubspec = loadYaml(pubspecContent);

    // Update app name and description
    pubspec['name'] = config['app_name'];
    pubspec['description'] = config['description'];

    // Update dependencies based on features
    if (config['features']['notifications']) {
      pubspec['dependencies']['flutter_local_notifications'] = '^16.3.0';
    }
    if (config['features']['gps']) {
      pubspec['dependencies']['google_maps_flutter'] = '^2.5.3';
    }
    // Add other feature-specific dependencies...

    await pubspecFile.writeAsString(pubspec.toString());
  }

  Future<void> _updateAppConfig() async {
    final configPath = path.join(outputPath, 'lib/config/app_config.dart');
    final configFile = File(configPath);

    final configContent = '''
// Generated app configuration
class AppConfig {
  static const String appName = '${config['app_name']}';
  static const String appVersion = '${config['version']}';
  
  // Feature flags
  static const bool hasNotifications = ${config['features']['notifications']};
  static const bool hasCoupons = ${config['features']['coupons']};
  static const bool hasGps = ${config['features']['gps']};
  static const bool hasPhotoReporting = ${config['features']['photo_reporting']};
  static const bool hasSocialSharing = ${config['features']['social_sharing']};
  
  // Theme configuration
  static const Map<String, String> colors = ${config['customization']['colors']};
  static const Map<String, String> fonts = ${config['customization']['fonts']};
}
''';

    await configFile.writeAsString(configContent);
  }

  Future<void> _generatePlatformFiles() async {
    // Generate Android files
    if (config['platforms']['android']) {
      await _generateAndroidFiles();
    }

    // Generate iOS files
    if (config['platforms']['ios']) {
      await _generateIOSFiles();
    }
  }

  Future<void> _generateAndroidFiles() async {
    final androidPath = path.join(outputPath, 'android');

    // Update AndroidManifest.xml
    final manifestPath = path.join(
      androidPath,
      'app/src/main/AndroidManifest.xml',
    );
    final manifestFile = File(manifestPath);
    var manifestContent = await manifestFile.readAsString();

    // Add permissions based on features
    if (config['features']['gps']) {
      manifestContent = manifestContent.replaceFirst(
        '</manifest>',
        '    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />\n    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />\n</manifest>',
      );
    }

    await manifestFile.writeAsString(manifestContent);
  }

  Future<void> _generateIOSFiles() async {
    final iosPath = path.join(outputPath, 'ios');

    // Update Info.plist
    final plistPath = path.join(iosPath, 'Runner/Info.plist');
    final plistFile = File(plistPath);
    var plistContent = await plistFile.readAsString();

    // Add permissions based on features
    if (config['features']['gps']) {
      plistContent = plistContent.replaceFirst(
        '</dict>',
        '    <key>NSLocationWhenInUseUsageDescription</key>\n    <string>This app needs access to location when open to show your position on the map.</string>\n    <key>NSLocationAlwaysUsageDescription</key>\n    <string>This app needs access to location when in the background to show your position on the map.</string>\n</dict>',
      );
    }

    await plistFile.writeAsString(plistContent);
  }
}
