const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
const AppGenerator = require('./scripts/generate_app');

const app = express();
const port = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/downloads', express.static(path.join(__dirname, 'builds')));

// Initialize paths
const TEMPLATES_DIR = path.join(__dirname, 'data', 'templates');
const CONFIGS_DIR = path.join(__dirname, 'data', 'configs');
const BUILDS_DIR = path.join(__dirname, 'builds');

// Ensure directories exist
fs.ensureDirSync(TEMPLATES_DIR);
fs.ensureDirSync(CONFIGS_DIR);
fs.ensureDirSync(BUILDS_DIR);

// Initialize generator
const generator = new AppGenerator(
  path.join(__dirname, 'templates', 'flutter_basic'),
  BUILDS_DIR
);

// API Endpoints

// List all templates
app.get('/api/templates', async (req, res) => {
  try {
    const templates = await fs.readdir(TEMPLATES_DIR);
    const templateData = await Promise.all(
      templates.map(async (name) => {
        const data = await fs.readJson(path.join(TEMPLATES_DIR, name));
        return { name: name.replace('.json', ''), ...data };
      })
    );
    res.json({ success: true, templates: templateData });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get specific template
app.get('/api/templates/:id', async (req, res) => {
  try {
    const templatePath = path.join(TEMPLATES_DIR, `${req.params.id}.json`);
    const template = await fs.readJson(templatePath);
    res.json({ success: true, template });
  } catch (error) {
    res.status(404).json({ success: false, error: 'Template not found' });
  }
});

// Create/Update template
app.post('/api/templates', async (req, res) => {
  try {
    const { name, ...templateData } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'Template name is required' });
    }
    
    const templatePath = path.join(TEMPLATES_DIR, `${name}.json`);
    await fs.writeJson(templatePath, templateData, { spaces: 2 });
    res.json({ success: true, name });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete template
app.delete('/api/templates/:id', async (req, res) => {
  try {
    const templatePath = path.join(TEMPLATES_DIR, `${req.params.id}.json`);
    await fs.remove(templatePath);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// List all configurations
app.get('/api/configs', async (req, res) => {
  try {
    const configs = await fs.readdir(CONFIGS_DIR);
    const configData = await Promise.all(
      configs.map(async (name) => {
        const data = await fs.readJson(path.join(CONFIGS_DIR, name));
        return { name: name.replace('.json', ''), ...data };
      })
    );
    res.json({ success: true, configs: configData });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get specific configuration
app.get('/api/configs/:id', async (req, res) => {
  try {
    const configPath = path.join(CONFIGS_DIR, `${req.params.id}.json`);
    const config = await fs.readJson(configPath);
    res.json({ success: true, config });
  } catch (error) {
    res.status(404).json({ success: false, error: 'Configuration not found' });
  }
});

// Save configuration
app.post('/api/configs', async (req, res) => {
  try {
    const { name, ...configData } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'Configuration name is required' });
    }
    
    const configPath = path.join(CONFIGS_DIR, `${name}.json`);
    await fs.writeJson(configPath, configData, { spaces: 2 });
    res.json({ success: true, name });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete configuration
app.delete('/api/configs/:id', async (req, res) => {
  try {
    const configPath = path.join(CONFIGS_DIR, `${req.params.id}.json`);
    await fs.remove(configPath);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Download APK
app.get('/api/download/:buildId/app-release.apk', async (req, res) => {
  try {
    const { buildId } = req.params;
    const apkPath = path.join(BUILDS_DIR, buildId, 'build', 'app', 'outputs', 'flutter-apk', 'app-release.apk');
    
    if (!fs.existsSync(apkPath)) {
      return res.status(404).json({
        success: false,
        error: 'APK file not found'
      });
    }

    res.download(apkPath);
  } catch (error) {
    console.error('Error downloading APK:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Generate app from configuration
app.post('/api/generate', async (req, res) => {
  try {
    const { configId } = req.body;
    
    // Load configuration
    const configPath = path.join(CONFIGS_DIR, `${configId}.json`);
    const config = await fs.readJson(configPath);
    
    // Generate the app
    const result = await generator.generateApp(config);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

    // Create download URL
    const apkFileName = path.basename(result.apkPath);
    const downloadUrl = `/api/download/${result.buildId}/app-release.apk`;

    res.json({
      success: true,
      buildId: result.buildId,
      downloadUrl,
      appName: config.appName
    });

  } catch (error) {
    console.error('Error generating app:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get build status
app.get('/api/builds/:buildId/status', async (req, res) => {
  const { buildId } = req.params;
  const buildDir = path.join(BUILDS_DIR, buildId);
  
  try {
    const exists = await fs.pathExists(buildDir);
    if (!exists) {
      return res.status(404).json({
        success: false,
        error: 'Build not found'
      });
    }

    const apkPath = path.join(buildDir, 'build', 'app', 'outputs', 'flutter-apk', 'app-release.apk');
    const apkExists = await fs.pathExists(apkPath);

    res.json({
      success: true,
      status: apkExists ? 'completed' : 'building',
      buildId
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Clean up old builds
app.delete('/api/builds/:buildId', async (req, res) => {
  const { buildId } = req.params;
  const buildDir = path.join(BUILDS_DIR, buildId);
  
  try {
    await fs.remove(buildDir);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Start server
app.listen(port, () => {
  console.log(`App generator server running on port ${port}`);
}); 