const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const { v4: uuidv4 } = require('uuid');

class AppGenerator {
  constructor(templateDir, buildsDir) {
    this.templateDir = templateDir;
    this.buildsDir = buildsDir;
  }

  async generateApp(config) {
    try {
      // Create unique build directory
      const buildId = uuidv4();
      const buildDir = path.join(this.buildsDir, buildId);
      console.log('Creating app in directory:', buildDir);

      // Copy template
      await fs.copy(this.templateDir, buildDir);
      console.log('Template copied successfully');

      // Update app configuration
      await this._updateAppConfig(buildDir, config);
      console.log('Configuration updated');

      // Update Android configuration
      await this._updateAndroidConfig(buildDir, config);
      console.log('Android configuration updated');

      // Update iOS configuration (if needed)
      // await this._updateIOSConfig(buildDir, config);

      // Build the app
      console.log('Building APK...');
      try {
        execSync('flutter build apk --release', { 
          cwd: buildDir,
          stdio: 'inherit'
        });

        const apkPath = path.join(buildDir, 'build', 'app', 'outputs', 'flutter-apk', 'app-release.apk');
        
        // Verify the APK exists
        if (!fs.existsSync(apkPath)) {
          throw new Error('APK file not found after build');
        }

        return {
          success: true,
          buildId,
          apkPath,
          buildDir
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

  async _updateAppConfig(buildDir, config) {
    const configPath = path.join(buildDir, 'assets', 'config.json');
    await fs.ensureDir(path.dirname(configPath));
    await fs.writeJson(configPath, config, { spaces: 2 });

    // Update pubspec.yaml with the new app name
    const pubspecPath = path.join(buildDir, 'pubspec.yaml');
    let pubspec = await fs.readFile(pubspecPath, 'utf8');
    pubspec = pubspec.replace(/name: .*/, `name: ${config.appName.toLowerCase().replace(/\s+/g, '_')}`);
    await fs.writeFile(pubspecPath, pubspec);
  }

  async _updateAndroidConfig(buildDir, config) {
    // Update Android package name
    const manifestPath = path.join(buildDir, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
    let manifest = await fs.readFile(manifestPath, 'utf8');
    manifest = manifest.replace(
      /package="[^"]*"/,
      `package="${config.packageName || 'com.example.app'}"`
    );
    manifest = manifest.replace(
      /android:label="[^"]*"/,
      `android:label="${config.appName}"`
    );
    await fs.writeFile(manifestPath, manifest);

    // Update build.gradle
    const buildGradlePath = path.join(buildDir, 'android', 'app', 'build.gradle');
    let buildGradle = await fs.readFile(buildGradlePath, 'utf8');
    buildGradle = buildGradle.replace(
      /applicationId "[^"]*"/,
      `applicationId "${config.packageName || 'com.example.app'}"`
    );
    await fs.writeFile(buildGradlePath, buildGradle);
  }
}

// Example usage
const generator = new AppGenerator(
  path.join(__dirname, '..', 'templates', 'flutter_basic'),
  path.join(__dirname, '..', 'builds')
);

// If running directly (not imported as a module)
if (require.main === module) {
  const sampleConfig = {
    appName: "Custom App",
    packageName: "com.example.customapp",
    theme: {
      primaryColor: "0xFF2196F3"
    },
    pages: [
      {
        title: "Home",
        type: "list",
        content: {
          items: [
            {
              title: "Custom Item",
              description: "This is a custom item"
            }
          ]
        }
      }
    ],
    settings: {
      version: "1.0.0"
    }
  };

  generator.generateApp(sampleConfig)
    .then(result => {
      if (result.success) {
        console.log('App generated successfully!');
        console.log('APK location:', result.apkPath);
      } else {
        console.error('Failed to generate app:', result.error);
      }
    })
    .catch(error => {
      console.error('Error:', error);
    });
}

module.exports = AppGenerator; 