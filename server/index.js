const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
const { generateApp } = require('./generate_flutter_app');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/downloads', express.static(path.join(__dirname, 'builds')));

// Initialize paths
const TEMPLATES_DIR = path.join(__dirname, 'data', 'templates');
const CONFIGS_DIR = path.join(__dirname, 'data', 'configs');
const BUILDS_DIR = path.join(__dirname, 'builds');

// Ensure directories exist
fs.ensureDirSync(TEMPLATES_DIR);
fs.ensureDirSync(CONFIGS_DIR);
fs.ensureDirSync(BUILDS_DIR);

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

// Generate app from configuration
app.post('/api/generate', async (req, res) => {
  try {
    const config = req.body;
    console.log('Received config:', JSON.stringify(config, null, 2));

    // Validace vstupních dat
    if (!config.appName) {
      return res.status(400).json({
        success: false,
        error: 'Název aplikace je povinný'
      });
    }

    if (!config.pages || !Array.isArray(config.pages) || config.pages.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Aplikace musí obsahovat alespoň jednu stránku'
      });
    }

    if (!config.settings) {
      return res.status(400).json({
        success: false,
        error: 'Nastavení aplikace je povinné'
      });
    }

    console.log('Generating app with config:', {
      appName: config.appName,
      pagesCount: config.pages.length,
      settings: config.settings
    });

    const result = await generateApp(config);
    
    if (!result.success) {
      console.error('App generation failed:', result.error);
      return res.status(500).json({
        success: false,
        error: result.error,
        details: result.details
      });
    }

    console.log('App generated successfully:', {
      buildId: result.buildId,
      path: result.buildPath
    });

    res.json({
      success: true,
      downloadUrl: `/downloads/${path.basename(result.buildPath)}`,
      buildId: result.buildId
    });
  } catch (error) {
    console.error('Error in /api/generate:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.stack
    });
  }
});

// Endpoint pro stahování vygenerované aplikace
app.get('/api/download/:appName', (req, res) => {
  const { appName } = req.params;
  const zipPath = path.join(__dirname, 'builds', `${appName}.zip`);
  
  if (!fs.existsSync(zipPath)) {
    return res.status(404).json({
      success: false,
      error: 'Aplikace nebyla nalezena'
    });
  }
  
  res.download(zipPath, `${appName}.zip`, (err) => {
    if (err) {
      console.error('Error downloading file:', err);
    }
    // Smaž soubor po stažení
    fs.unlink(zipPath).catch(console.error);
  });
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
  console.log(`Server běží na portu ${port}`);
}); 