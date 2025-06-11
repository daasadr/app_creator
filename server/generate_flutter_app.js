const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const { v4: uuidv4 } = require('uuid');

// Správné cesty k adresářům
const TEMPLATE_DIR = path.join(__dirname, 'templates', 'flutter_basic');
const BUILDS_DIR = path.join(__dirname, 'builds');

// Validace šablony
async function validateTemplate() {
  const requiredFiles = [
    'lib/main.dart',
    'lib/controllers/app_controller.dart',
    'lib/screens/home_screen.dart',
    'pubspec.yaml'
  ];
  
  for (const file of requiredFiles) {
    const filePath = path.join(TEMPLATE_DIR, file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Missing required file in template: ${file}`);
    }
  }
}

// Validace konfigurace
function validateConfig(config) {
  if (!config.appName) {
    throw new Error('App name is required');
  }
  if (!config.pages || !Array.isArray(config.pages) || config.pages.length === 0) {
    throw new Error('At least one page is required');
  }
  if (!config.settings) {
    throw new Error('App settings are required');
  }
}

// Aktualizace obsahu aplikace
async function updateAppContent(buildDir, config) {
  // Aktualizace app_controller.dart
  const controllerPath = path.join(buildDir, 'lib', 'controllers', 'app_controller.dart');
  let controller = await fs.readFile(controllerPath, 'utf8');
  
  // Nahrazení placeholderů skutečným obsahem
  controller = controller.replace(
    /List<Map<String, dynamic>> _pages = \[\];/,
    `List<Map<String, dynamic>> _pages = ${JSON.stringify(config.pages, null, 2)};`
  );
  controller = controller.replace(
    /Map<String, dynamic> _appSettings = {};/,
    `Map<String, dynamic> _appSettings = ${JSON.stringify(config.settings, null, 2)};`
  );
  
  await fs.writeFile(controllerPath, controller);
  console.log('App content updated successfully');
}

// Aktualizace konfigurace aplikace
async function updateAppConfig(buildDir, config) {
  // Aktualizace pubspec.yaml
  const pubspecPath = path.join(buildDir, 'pubspec.yaml');
  let pubspec = await fs.readFile(pubspecPath, 'utf8');
  pubspec = pubspec.replace(/name: .*/, `name: ${config.appName.toLowerCase().replace(/\s+/g, '_')}`);
  pubspec = pubspec.replace(/version: .*/, `version: ${config.version || '1.0.0'}`);
  await fs.writeFile(pubspecPath, pubspec);
  console.log('pubspec.yaml updated successfully');

  // Nastav packageName
  const appName = config.title || config.appName || 'Generated App';
  const packageName = config.packageName || `com.example.${appName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

  // build.gradle
  const buildGradlePath = path.join(buildDir, 'android', 'app', 'build.gradle');
  let buildGradle = await fs.readFile(buildGradlePath, 'utf8');
  buildGradle = buildGradle.replace(
    /applicationId ".*"/, `applicationId "${packageName}"`
  );
  buildGradle = buildGradle.replace(
    /namespace "com\.example\.flutter_basic"/g,
    `namespace "${packageName}"`
  );
  // Nastav compileSdkVersion na 35
  buildGradle = buildGradle.replace(
    /compileSdkVersion \d+/,
    'compileSdkVersion 35'
  );
  // Nastav ndkVersion na 25.1.8937393 (přidej nebo nahraď v sekci android)
  if (buildGradle.match(/ndkVersion ".*"/)) {
    buildGradle = buildGradle.replace(
      /ndkVersion ".*"/,
      'ndkVersion "25.1.8937393"'
    );
  } else {
    buildGradle = buildGradle.replace(
      /(android\s*{[\s\S]*?)(\n\s*defaultConfig)/,
      `$1\n    ndkVersion \"25.1.8937393\"$2`
    );
  }
  await fs.writeFile(buildGradlePath, buildGradle);
  console.log('Android configuration updated (build.gradle only, applicationId, namespace, compileSdkVersion, ndkVersion)');

  await changeMainActivityPackage(buildDir, packageName);

  // AndroidManifest.xml
  const manifestPath = path.join(buildDir, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
  let manifest = await fs.readFile(manifestPath, 'utf8');
  // Nahraď všechny možné varianty android:name u MainActivity za nový package
  manifest = manifest.replace(
    /android:name="(\.MainActivity|com\.[a-zA-Z0-9_]+\.[a-zA-Z0-9_]+\.MainActivity)"/g,
    `android:name="${packageName}.MainActivity"`
  );
  await fs.writeFile(manifestPath, manifest);
  console.log('AndroidManifest.xml updated with correct MainActivity package (all variants).');
}

const changeMainActivityPackage = async (buildDir, packageName) => {
  // Zjisti cestu ke staré MainActivity
  const oldPackage = 'com.example.flutter_basic';
  const oldPath = path.join(buildDir, 'android', 'app', 'src', 'main', 'kotlin', ...oldPackage.split('.'), 'MainActivity.kt');
  if (!(await fs.pathExists(oldPath))) {
    console.warn('MainActivity.kt nenalezen, přeskočeno přejmenování balíčku.');
    return;
  }
  // Nová cesta
  const newPath = path.join(buildDir, 'android', 'app', 'src', 'main', 'kotlin', ...packageName.split('.'), 'MainActivity.kt');
  await fs.ensureDir(path.dirname(newPath));
  // Uprav package deklaraci
  let content = await fs.readFile(oldPath, 'utf8');
  content = content.replace(/^package .*/m, `package ${packageName}`);
  await fs.writeFile(newPath, content);
  await fs.remove(oldPath);
  // Smaž prázdné složky po přesunu (volitelné)
};

// Hlavní funkce pro generování aplikace
async function generateApp(config) {
  try {
    console.log('Starting app generation...');
    
    // Validace šablony a konfigurace
    await validateTemplate();
    validateConfig(config);
    
    // Vytvoření unikátního build adresáře
    const buildId = uuidv4();
    const buildDir = path.join(BUILDS_DIR, buildId);
    console.log('Creating build directory:', buildDir);
    
    // Zajištění existence adresářů
    await fs.ensureDir(BUILDS_DIR);
    await fs.ensureDir(buildDir);
    
    // Kopírování šablony
    console.log('Copying template...');
    await fs.copy(TEMPLATE_DIR, buildDir, {
      filter: (src, dest) => {
        if (src.split(path.sep).includes('.gradle')) return false;
        if (src.endsWith('.lock')) return false;
        return true;
      }
    });
    
    // Aktualizace konfigurace a obsahu
    await updateAppConfig(buildDir, config);
    await updateAppContent(buildDir, config);
    
    // Build aplikace
    console.log('Building APK...');
    try {
      // Čištění před buildem
      execSync('flutter clean', { cwd: buildDir, stdio: 'inherit' });
      
      // Instalace závislostí
      execSync('flutter pub get', { cwd: buildDir, stdio: 'inherit' });
      
      // Build APK
      execSync('flutter build apk --release', { cwd: buildDir, stdio: 'inherit' });
      
      // Kontrola výstupního souboru
      const apkPath = path.join(buildDir, 'build', 'app', 'outputs', 'flutter-apk', 'app-release.apk');
      if (!fs.existsSync(apkPath)) {
        throw new Error('APK file not found after build');
      }
      
      // Kopírování do downloads adresáře
      const downloadsDir = path.join(BUILDS_DIR, 'downloads');
      await fs.ensureDir(downloadsDir);
      const downloadPath = path.join(downloadsDir, `${config.appName.toLowerCase().replace(/\s+/g, '_')}.apk`);
      await fs.copy(apkPath, downloadPath);
      
      console.log('APK generated successfully at:', downloadPath);
      return {
        success: true,
        buildPath: downloadPath,
        buildId
      };
      
    } catch (buildError) {
      console.error('Build error:', buildError);
      return {
        success: false,
        error: 'Build failed: ' + buildError.message,
        buildId,
        buildDir
      };
    }
    
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
  pages: [
    // Add your page configurations here
  ],
  settings: {
    // Add your settings here
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