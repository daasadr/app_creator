const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const { v4: uuidv4 } = require('uuid');

const TEMPLATE_DIR = path.join(__dirname, 'templates', 'flutter_basic');
const BUILDS_DIR = path.join(__dirname, 'builds');

async function generateApp(config) {
  try {
    const {
      appName,
      packageName = 'com.example.app',
      version = '1.0.0',
      buildType = 'apk', // 'apk' or 'aab'
      icon,
      splashScreen,
      customizations = {}
    } = config;

    if (!appName) {
      throw new Error('App name is required');
    }

    // Create unique build directory
    const appId = uuidv4();
    const appDir = path.join(BUILDS_DIR, appId);
    console.log('Creating app in directory:', appDir);

    // Ensure build directory exists
    await fs.ensureDir(BUILDS_DIR);

    // Copy template
    await fs.copy(TEMPLATE_DIR, appDir);
    console.log('Template copied successfully');

    // Update pubspec.yaml
    const pubspecPath = path.join(appDir, 'pubspec.yaml');
    let pubspec = await fs.readFile(pubspecPath, 'utf8');
    pubspec = pubspec.replace(/name: .*/, `name: ${appName.toLowerCase().replace(/\s+/g, '_')}`);
    pubspec = pubspec.replace(/version: .*/, `version: ${version}`);
    await fs.writeFile(pubspecPath, pubspec);
    console.log('pubspec.yaml updated');

    // Update Android package name
    const androidManifestPath = path.join(appDir, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
    let manifest = await fs.readFile(androidManifestPath, 'utf8');
    manifest = manifest.replace(/package=".*"/, `package="${packageName}"`);
    await fs.writeFile(androidManifestPath, manifest);
    console.log('Android package name updated');

    // Apply customizations if any
    if (icon) {
      const iconPath = path.join(appDir, 'android', 'app', 'src', 'main', 'res', 'mipmap-xxxhdpi', 'ic_launcher.png');
      await fs.copy(icon, iconPath);
      console.log('Custom icon applied');
    }

    // Run flutter commands
    console.log('Running flutter pub get...');
    execSync('flutter pub get', { cwd: appDir, stdio: 'inherit' });

    console.log(`Building ${buildType.toUpperCase()}...`);
    const buildCommand = buildType === 'aab' 
      ? 'flutter build appbundle --release'
      : 'flutter build apk --release';
    
    execSync(buildCommand, { cwd: appDir, stdio: 'inherit' });

    // Get output file path
    const outputPath = buildType === 'aab'
      ? path.join(appDir, 'build', 'app', 'outputs', 'bundle', 'release', 'app-release.aab')
      : path.join(appDir, 'build', 'app', 'outputs', 'flutter-apk', 'app-release.apk');

    if (!fs.existsSync(outputPath)) {
      throw new Error(`Build failed: ${buildType} file not found at ${outputPath}`);
    }

    console.log(`${buildType.toUpperCase()} generated successfully at: ${outputPath}`);
    return {
      success: true,
      buildPath: outputPath,
      buildId: appId
    };

  } catch (error) {
    console.error('Error generating app:', error);
    return {
      success: false,
      error: error.message,
      details: error.stack
    };
  }
}

module.exports = { generateApp };

// Example usage:
/*
const config = {
  appName: 'My Test App',
  packageName: 'com.example.mytestapp',
  version: '1.0.0',
  buildType: 'apk', // or 'aab'
  customizations: {
    primaryColor: '#FF0000',
    // other customization options
  }
};

generateApp(config).then(result => {
  if (result.success) {
    console.log('Build successful:', result.buildPath);
  } else {
    console.error('Build failed:', result.error);
  }
});
*/ 