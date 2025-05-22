import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs'

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      templateName,
      appName,
      appIcon,
      description,
      features,
      customization,
    } = body

    // Validate input
    if (!templateName || !appName) {
      return NextResponse.json(
        {
          success: false,
          message: 'Missing required fields',
        },
        { status: 400 }
      )
    }

    // Create output directory
    const outputDir = path.join(process.cwd(), 'generated_apps', appName)
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    // Prepare configuration
    const config = {
      app_name: appName,
      description: description || 'Generated mobile application',
      version: '1.0.0',
      features: {
        notifications: features?.notifications ?? true,
        coupons: features?.coupons ?? true,
        gps: features?.gps ?? false,
        photo_reporting: features?.photoReporting ?? false,
        social_sharing: features?.socialSharing ?? false,
      },
      customization: {
        colors: customization?.colors || {
          primary: '#007AFF',
          secondary: '#5856D6',
          background: '#FFFFFF',
          text: '#000000',
        },
        fonts: customization?.fonts || {
          heading: 'System',
          body: 'System',
        },
      },
      platforms: {
        android: true,
        ios: false, // iOS support coming soon
      },
    }

    // Generate app using Flutter
    const templatePath = path.join(process.cwd(), 'templates', 'flutter_basic')
    
    // Run Flutter create command
    await execAsync(`flutter create --org com.generated ${appName} ${outputDir}`)
    
    // Copy template files
    await execAsync(`cp -r ${templatePath}/* ${outputDir}`)
    
    // Update app configuration
    const configPath = path.join(outputDir, 'lib/config/app_config.dart')
    fs.writeFileSync(
      configPath,
      `// Generated app configuration
class AppConfig {
  static const String appName = '${config.app_name}';
  static const String appVersion = '${config.version}';
  
  // Feature flags
  static const bool hasNotifications = ${config.features.notifications};
  static const bool hasCoupons = ${config.features.coupons};
  static const bool hasGps = ${config.features.gps};
  static const bool hasPhotoReporting = ${config.features.photo_reporting};
  static const bool hasSocialSharing = ${config.features.social_sharing};
  
  // Theme configuration
  static const Map<String, String> colors = ${JSON.stringify(config.customization.colors)};
  static const Map<String, String> fonts = ${JSON.stringify(config.customization.fonts)};
}`
    )

    // Build Android APK
    await execAsync(`cd ${outputDir} && flutter build apk --release`)

    // Get the APK path
    const apkPath = path.join(
      outputDir,
      'build',
      'app',
      'outputs',
      'flutter-apk',
      'app-release.apk'
    )

    return NextResponse.json({
      success: true,
      message: 'App generated successfully',
      data: {
        appId: appName,
        status: 'completed',
        downloadUrl: `/api/download/${appName}`,
        apkPath,
      },
    })
  } catch (error) {
    console.error('Error generating app:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to generate app',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
} 