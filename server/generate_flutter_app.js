const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const { v4: uuidv4 } = require('uuid');

const TEMPLATE_DIR = path.join(__dirname, 'templates', 'flutter_basic');
const BUILDS_DIR = path.join(__dirname, 'builds');

function generateApp(config) {
  const appId = uuidv4();
  const appDir = path.join(BUILDS_DIR, appId);

  // 1. Zkopíruj šablonu
  fs.copySync(TEMPLATE_DIR, appDir);

  // 2. Uprav pubspec.yaml (název aplikace)
  const pubspecPath = path.join(appDir, 'pubspec.yaml');
  let pubspec = fs.readFileSync(pubspecPath, 'utf8');
  pubspec = pubspec.replace(/name: .*/, `name: ${config.appName}`);
  fs.writeFileSync(pubspecPath, pubspec);

  // 3. Spusť build
  execSync('flutter pub get', { cwd: appDir, stdio: 'inherit' });
  execSync('flutter build apk', { cwd: appDir, stdio: 'inherit' });

  // 4. Vrať cestu k APK
  return path.join(appDir, 'build', 'app', 'outputs', 'flutter-apk', 'app-release.apk');
}

// Příklad použití:
const config = { appName: 'test_app' };
const apkPath = generateApp(config);
console.log('APK vygenerováno:', apkPath); 