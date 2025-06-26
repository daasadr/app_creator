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
  // Aktualizace app_controller.dart - inicializace dat
  const controllerPath = path.join(buildDir, 'lib', 'controllers', 'app_controller.dart');
  let controller = await fs.readFile(controllerPath, 'utf8');
  
  // Přidej metodu pro inicializaci dat, pokud ještě neexistuje
  if (!controller.includes('initializeWithGeneratorData')) {
    const initDataCall = `
  // Initialize with generator data
  void initializeWithGeneratorData() {
    initializeAppData(${JSON.stringify(config.pages, null, 2)}, ${JSON.stringify(config.settings, null, 2)});
  }`;
    
    // Najdi konec třídy a přidej metodu před poslední závorku
    const lastBraceIndex = controller.lastIndexOf('}');
    if (lastBraceIndex !== -1) {
      controller = controller.slice(0, lastBraceIndex) + initDataCall + '\n' + controller.slice(lastBraceIndex);
    }
  }
  
  await fs.writeFile(controllerPath, controller);
  console.log('App controller updated with initialization method');

  // Aktualizace main.dart - volání inicializace
  const mainPath = path.join(buildDir, 'lib', 'main.dart');
  let mainContent = await fs.readFile(mainPath, 'utf8');
  
  // Najdi místo kde se vytváří AppController a přidej inicializaci
  if (!mainContent.includes('initializeWithGeneratorData')) {
    mainContent = mainContent.replace(
      /(ChangeNotifierProvider\(create: \(_\) => AppController\(\)\))/,
      `ChangeNotifierProvider(create: (_) {
        final controller = AppController();
        controller.initializeWithGeneratorData();
        return controller;
      })`
    );
  }
  
  await fs.writeFile(mainPath, mainContent);
  console.log('Main.dart updated with controller initialization');

  // Aktualizace config.json v assets
  const configPath = path.join(buildDir, 'assets', 'config.json');
  const configData = {
    appName: config.appName,
    pages: config.pages,
    settings: config.settings
  };
  await fs.writeFile(configPath, JSON.stringify(configData, null, 2));
  console.log('Assets config.json updated');
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

  // Použij packageName z configu
  const packageName = config.packageName || 'com.example.flutter_basic';

  // build.gradle
  const buildGradlePath = path.join(buildDir, 'android', 'app', 'build.gradle');
  let buildGradle = await fs.readFile(buildGradlePath, 'utf8');
  buildGradle = buildGradle.replace(
    /applicationId ".*"/, `applicationId "${packageName}"`
  );
  buildGradle = buildGradle.replace(
    /namespace ".*"/g,
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
  
  // Nahraď package v manifestu
  manifest = manifest.replace(/package="[^"]*"/, `package="${packageName}"`);
  
  // Nahraď android:name u MainActivity za nový package
  manifest = manifest.replace(
    /android:name="(\.MainActivity|com\.[a-zA-Z0-9_]+\.[a-zA-Z0-9_]+\.MainActivity)"/g,
    `android:name="${packageName}.MainActivity"`
  );
  
  await fs.writeFile(manifestPath, manifest);
  console.log(`AndroidManifest.xml aktualizován s package "${packageName}" a MainActivity "${packageName}.MainActivity"`);

  // Aktualizace strings.xml - název aplikace
  const stringsPath = path.join(buildDir, 'android', 'app', 'src', 'main', 'res', 'values', 'strings.xml');
  let strings = await fs.readFile(stringsPath, 'utf8');
  strings = strings.replace(/<string name="app_name">.*<\/string>/, `<string name="app_name">${config.appName}</string>`);
  await fs.writeFile(stringsPath, strings);
  console.log('strings.xml updated with app name:', config.appName);
}

const changeMainActivityPackage = async (buildDir, packageName) => {
  console.log(`Přesouvám MainActivity z com.example.flutter_basic do ${packageName}...`);
  
  // Zjisti cestu ke staré MainActivity
  const oldPackage = 'com.example.flutter_basic';
  const oldPath = path.join(buildDir, 'android', 'app', 'src', 'main', 'kotlin', ...oldPackage.split('.'), 'MainActivity.kt');
  
  // Nová cesta podle nového packageName
  const newPath = path.join(buildDir, 'android', 'app', 'src', 'main', 'kotlin', ...packageName.split('.'), 'MainActivity.kt');
  
  console.log(`Stará cesta: ${oldPath}`);
  console.log(`Nová cesta: ${newPath}`);
  
  // Pokud MainActivity neexistuje, vytvoř ho
  if (!(await fs.pathExists(oldPath))) {
    console.log('MainActivity.kt nenalezen, vytvářím nový...');
    const templateMainActivity = path.join(TEMPLATE_DIR, 'android', 'app', 'src', 'main', 'kotlin', ...oldPackage.split('.'), 'MainActivity.kt');
    
    if (await fs.pathExists(templateMainActivity)) {
      await fs.ensureDir(path.dirname(oldPath));
      await fs.copy(templateMainActivity, oldPath);
      console.log('MainActivity.kt zkopírován z template');
    } else {
      console.error('MainActivity.kt nenalezen ani v template!');
      return;
    }
  }
  
  // Vždy přesuň soubor do nové složky (i když se package name neliší, pro jistotu)
  await fs.ensureDir(path.dirname(newPath));
  
  // Přečti obsah a aktualizuj package deklaraci
  let content = await fs.readFile(oldPath, 'utf8');
  content = content.replace(/^package .*/m, `package ${packageName}`);
  
  // Zapiš do nové lokace
  await fs.writeFile(newPath, content);
  
  // Smaž starý soubor
  if (oldPath !== newPath) {
    await fs.remove(oldPath);
    console.log(`MainActivity přesunut z ${oldPackage} do ${packageName}`);
  } else {
    console.log(`MainActivity aktualizován s package ${packageName}`);
  }
  
  // Smaž prázdné složky po přesunu
  try {
    const oldDir = path.dirname(oldPath);
    if (oldDir !== path.dirname(newPath)) {
      const files = await fs.readdir(oldDir);
      if (files.length === 0) {
        await fs.remove(oldDir);
        console.log(`Smazána prázdná složka: ${oldDir}`);
      }
    }
  } catch (e) {
    // Ignore errors when removing empty directories
  }
  
  console.log(`MainActivity úspěšně přesunuta do ${packageName}`);
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