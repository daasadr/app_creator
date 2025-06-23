const { generateApp } = require('./generate_flutter_app.js');

const minimalConfig = {
  appName: 'Minimal Test',
  pages: [
    {
      title: 'Test',
      type: 'content',
      content: 'This is a minimal test app.',
    }
  ],
  settings: {
    appName: 'Minimal Test',
    version: '1.0.0'
  }
};

console.log('Testing minimal app generator...');
generateApp(minimalConfig).then(result => {
  console.log('Result:', JSON.stringify(result, null, 2));
}).catch(error => {
  console.error('Error:', error);
}); 