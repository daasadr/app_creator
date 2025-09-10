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
    initializeAppData(${JSON.stringify(config.pages, null, 2)}, ${JSON.stringify(config.settings, null, 2)}, ${JSON.stringify(config.appId || null)});
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
  
  // Odstraníme starý způsob inicializace - nový je v main.dart
  // main.dart už má vlastní inicializaci s Firebase a appId
  
  await fs.writeFile(mainPath, mainContent);
  console.log('Main.dart updated with controller initialization');

  // Aktualizace config.json v assets - zpracování nových polí
  const configPath = path.join(buildDir, 'assets', 'config.json');
  
  // Zpracování stránek - zajištění kompatibility
  const processedPages = config.pages.map(page => {
    console.log(`Processing page: ${page.title || 'Untitled'}`);
    console.log(`  Original blocks:`, page.blocks ? page.blocks.length : 'none');
    console.log(`  Original images:`, page.images ? page.images.length : 'none');
    
    const processedPage = { ...page };
    
    // Zajištění kompatibility s richContent
    if (processedPage.richContent && !processedPage.content) {
      processedPage.content = processedPage.richContent;
    }
    
    // DŮLEŽITÉ: Zpracování pole blocks - obrázky i text
    if (processedPage.blocks && Array.isArray(processedPage.blocks)) {
      // Najdi všechny obrázky v blocích
      const imageBlocks = processedPage.blocks.filter(block => block.type === 'image');
      const textBlocks = processedPage.blocks.filter(block => block.type === 'text');
      
      // Zpracuj text bloky - slouč je do content
      if (textBlocks.length > 0) {
        const textContent = textBlocks.map(block => block.content || '').join('\n\n');
        if (textContent.trim()) {
          // Přidej text k existujícímu content
          processedPage.content = (processedPage.content || '') + (processedPage.content ? '\n\n' : '') + textContent;
          console.log(`  Added text from ${textBlocks.length} text blocks`);
        }
      }
      
      // Zpracuj obrázky z bloků
      if (imageBlocks.length > 0) {
        // Přidej obrázky z bloků do pole images s zachováním velikostí
        const blockImages = imageBlocks.map(block => ({
          url: block.url,
          alt: block.alt || '',
          position: block.align || 'center',
          width: block.width || 300, // Zachovej nastavenou velikost
          margin: 10
        }));
        
        // Slouč s existujícími obrázky, ale vyhni se duplikaci
        if (processedPage.images && Array.isArray(processedPage.images)) {
          // Najdi obrázky, které ještě nejsou v images poli
          const existingUrls = processedPage.images.map(img => img.url);
          const newBlockImages = blockImages.filter(blockImg => !existingUrls.includes(blockImg.url));
          processedPage.images = [...processedPage.images, ...newBlockImages];
          console.log(`  Added ${newBlockImages.length} new images from blocks (${blockImages.length - newBlockImages.length} duplicates skipped)`);
        } else {
          processedPage.images = blockImages;
        }
        
        console.log(`  Extracted ${imageBlocks.length} images from blocks:`, blockImages.map(img => `${img.url} (width: ${img.width})`));
      }
    }
    
    // Zajištění kompatibility s images - zachovej velikosti
    if (processedPage.images && processedPage.images.length > 0 && !processedPage.imageUrl) {
      processedPage.imageUrl = processedPage.images[0].url;
    }
    
    // Zajištění kompatibility se starým způsobem - zachovej velikosti
    if (processedPage.imageUrl && (!processedPage.images || processedPage.images.length === 0)) {
      processedPage.images = [{
        url: processedPage.imageUrl,
        alt: '',
        position: 'center',
        width: processedPage.imageWidth || 100, // Zachovej nastavenou velikost
        margin: 10
      }];
    }
    
    // Zachovej velikosti obrázků z editoru
    if (processedPage.images && Array.isArray(processedPage.images)) {
      processedPage.images = processedPage.images.map(img => ({
        ...img,
        width: img.width || 300, // Zachovej nastavenou velikost
        position: img.position || 'center',
        margin: img.margin || 10
      }));
    }
    
    console.log(`  Final images count:`, processedPage.images ? processedPage.images.length : 'none');
    console.log(`  Final imageUrl:`, processedPage.imageUrl || 'none');
    console.log(`  Offline content:`, processedPage.offlineContent ? 'present' : 'missing');
    console.log(`  Offline title:`, processedPage.offlineTitle || 'none');
    
    return processedPage;
  });
  
  const configData = {
    appName: config.appName,
    appId: config.appId, // Přidáme appId pro Firestore načítání
    pages: processedPages,
    settings: config.settings
  };
  
  console.log('Final config.json structure:');
  console.log('  App name:', configData.appName);
  console.log('  Pages count:', configData.pages.length);
  configData.pages.forEach((page, idx) => {
    console.log(`  Page ${idx + 1}: ${page.title || 'Untitled'}`);
    console.log(`    Images: ${page.images ? page.images.length : 0}`);
    console.log(`    Blocks: ${page.blocks ? page.blocks.length : 0}`);
    console.log(`    Offline content: ${page.offlineContent ? 'present' : 'missing'}`);
    if (page.images && page.images.length > 0) {
      console.log(`    Image URLs:`, page.images.map(img => img.url));
    }
  });
  
  await fs.writeFile(configPath, JSON.stringify(configData, null, 2));
  console.log('Assets config.json updated with rich content and images support');
}

// Aktualizace konfigurace aplikace
async function updateAppConfig(buildDir, config) {
  // Aktualizace pubspec.yaml
  const pubspecPath = path.join(buildDir, 'pubspec.yaml');
  let pubspec = await fs.readFile(pubspecPath, 'utf8');
  
  // Vytvoř platný Dart identifikátor - odstraň diakritiku a nahraď mezerami podtržítky
  const validDartName = config.appName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Odstraň diakritiku
    .replace(/[^a-z0-9_]/g, '_') // Nahraď neplatné znaky podtržítky
    .replace(/_+/g, '_') // Nahraď více podtržítek jednou
    .replace(/^_|_$/g, ''); // Odstraň podtržítka na začátku a konci
  
  pubspec = pubspec.replace(/name: .*/, `name: ${validDartName}`);
  pubspec = pubspec.replace(/version: .*/, `version: ${config.version || '1.0.0'}`);
  await fs.writeFile(pubspecPath, pubspec);
  console.log('pubspec.yaml updated successfully');

  // Použij packageName z configu
  const packageName = config.packageName || 'com.example.flutter_basic';

  // Zkopíruj správný google-services.json pokud existuje
  // Mapuj package name na adresář (odstraň podtržítka)
  const packageDir = packageName.replace(/_/g, '');
  const googleServicesPath = path.join(__dirname, 'google-services', packageDir, 'google-services.json');
  const destPath = path.join(buildDir, 'android', 'app', 'google-services.json');
  const wrongSrcPath = path.join(buildDir, 'android', 'app', 'src', 'google-services.json');
  // Smaž špatný soubor v src, pokud existuje
  if (fs.existsSync(wrongSrcPath)) {
    await fs.remove(wrongSrcPath);
    console.log('Smazán špatný google-services.json v src');
  }
  if (fs.existsSync(googleServicesPath)) {
    await fs.copy(googleServicesPath, destPath);
    console.log('Použit správný google-services.json pro', packageName);
  } else {
    console.warn('Chybí google-services.json pro', packageName, 'v adresáři', packageDir);
  }

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