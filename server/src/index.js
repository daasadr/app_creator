const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { exec } = require('child_process');
const archiver = require('archiver');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    fs.ensureDirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

// Routes
app.post('/api/generate', async (req, res) => {
  try {
    const { appName, appDescription, pages, buildApk, buildAab } = req.body;
    const buildId = uuidv4();
    const buildDir = path.join(__dirname, '../builds', buildId);
    await fs.ensureDir(buildDir);
    await fs.copy(
      path.join(__dirname, '../../templates/flutter_basic'),
      buildDir
    );
    const pubspecPath = path.join(buildDir, 'pubspec.yaml');
    let pubspecContent = await fs.readFile(pubspecPath, 'utf8');
    pubspecContent = pubspecContent.replace(
      /name: generated_app/,
      `name: ${appName.toLowerCase().replace(/\s+/g, '_')}`
    );
    await fs.writeFile(pubspecPath, pubspecContent);
    const manifestPath = path.join(buildDir, 'android/app/src/main/AndroidManifest.xml');
    let manifestContent = await fs.readFile(manifestPath, 'utf8');
    manifestContent = manifestContent.replace(
      /android:label="Generated App"/,
      `android:label="${appName}"`
    );
    await fs.writeFile(manifestPath, manifestContent);

    // Build commands
    let buildCmds = [];
    if (buildApk) buildCmds.push('flutter build apk --release');
    if (buildAab) buildCmds.push('flutter build appbundle --release');
    if (buildCmds.length === 0) {
      return res.status(400).json({ error: 'Musíte zvolit alespoň jeden build formát.' });
    }
    const buildCmd = buildCmds.join(' && ');

    const buildProcess = exec(
      `cd "${buildDir}" && ${buildCmd}`,
      async (error, stdout, stderr) => {
        if (error) {
          console.error(`Build error: ${error}`);
          return res.status(500).json({ error: 'Build failed' });
        }
        // Prepare files for zipping
        const files = [];
        if (buildApk) {
          const apkPath = path.join(buildDir, 'build/app/outputs/flutter-apk/app-release.apk');
          if (await fs.pathExists(apkPath)) files.push({ path: apkPath, name: 'app.apk' });
        }
        if (buildAab) {
          const aabPath = path.join(buildDir, 'build/app/outputs/bundle/release/app-release.aab');
          if (await fs.pathExists(aabPath)) files.push({ path: aabPath, name: 'app.aab' });
        }
        if (files.length === 0) {
          return res.status(500).json({ error: 'Build soubory nebyly nalezeny.' });
        }
        // Create a zip file containing the builds
        const zipPath = path.join(buildDir, 'app.zip');
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });
        output.on('close', () => {
          res.json({
            success: true,
            buildId,
            downloadUrl: `/api/download/${buildId}`
          });
        });
        archive.pipe(output);
        for (const file of files) {
          archive.file(file.path, { name: file.name });
        }
        archive.finalize();
      }
    );
    buildProcess.stdout.on('data', (data) => {
      console.log(`Build output: ${data}`);
    });
    buildProcess.stderr.on('data', (data) => {
      console.error(`Build error: ${data}`);
    });
  } catch (error) {
    console.error('Generation error:', error);
    res.status(500).json({ error: 'Generation failed' });
  }
});

app.get('/api/download/:buildId', (req, res) => {
  const { buildId } = req.params;
  const zipPath = path.join(__dirname, '../builds', buildId, 'app.zip');
  
  if (fs.existsSync(zipPath)) {
    res.download(zipPath, 'app.zip', (err) => {
      if (err) {
        console.error('Download error:', err);
        res.status(500).json({ error: 'Download failed' });
      }
    });
  } else {
    res.status(404).json({ error: 'Build not found' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 