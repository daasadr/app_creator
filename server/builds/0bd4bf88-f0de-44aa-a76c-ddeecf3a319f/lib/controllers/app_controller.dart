import 'package:get/get.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:dio/dio.dart';

class AppController extends GetxController {
  final Dio _dio = Dio();
  final RxBool isLoading = false.obs;
  final RxString appName = ''.obs;
  final RxString appVersion = ''.obs;
  final RxBool isDarkMode = false.obs;

  // Feature flags
  final RxBool hasNotifications = true.obs;
  final RxBool hasCoupons = true.obs;
  final RxBool hasGps = false.obs;
  final RxBool hasPhotoReporting = false.obs;
  final RxBool hasSocialSharing = false.obs;

  @override
  void onInit() {
    super.onInit();
    _loadAppSettings();
  }

  Future<void> _loadAppSettings() async {
    try {
      isLoading.value = true;
      final prefs = await SharedPreferences.getInstance();

      // Load app settings from local storage
      appName.value = prefs.getString('app_name') ?? 'Generated App';
      appVersion.value = prefs.getString('app_version') ?? '1.0.0';
      isDarkMode.value = prefs.getBool('dark_mode') ?? false;

      // Load feature flags
      hasNotifications.value = prefs.getBool('feature_notifications') ?? true;
      hasCoupons.value = prefs.getBool('feature_coupons') ?? true;
      hasGps.value = prefs.getBool('feature_gps') ?? false;
      hasPhotoReporting.value =
          prefs.getBool('feature_photo_reporting') ?? false;
      hasSocialSharing.value = prefs.getBool('feature_social_sharing') ?? false;
    } catch (e) {
      print('Error loading app settings: $e');
    } finally {
      isLoading.value = false;
    }
  }

  Future<void> updateAppSettings({
    String? name,
    String? version,
    bool? darkMode,
    Map<String, bool>? features,
  }) async {
    try {
      isLoading.value = true;
      final prefs = await SharedPreferences.getInstance();

      if (name != null) {
        await prefs.setString('app_name', name);
        appName.value = name;
      }

      if (version != null) {
        await prefs.setString('app_version', version);
        appVersion.value = version;
      }

      if (darkMode != null) {
        await prefs.setBool('dark_mode', darkMode);
        isDarkMode.value = darkMode;
      }

      if (features != null) {
        for (var entry in features.entries) {
          await prefs.setBool('feature_${entry.key}', entry.value);
          switch (entry.key) {
            case 'notifications':
              hasNotifications.value = entry.value;
              break;
            case 'coupons':
              hasCoupons.value = entry.value;
              break;
            case 'gps':
              hasGps.value = entry.value;
              break;
            case 'photo_reporting':
              hasPhotoReporting.value = entry.value;
              break;
            case 'social_sharing':
              hasSocialSharing.value = entry.value;
              break;
          }
        }
      }
    } catch (e) {
      print('Error updating app settings: $e');
    } finally {
      isLoading.value = false;
    }
  }
}
