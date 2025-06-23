const { generateApp } = require('./generate_flutter_app.js');

const simpleConfig = {
  appName: 'Simple Test',
  pages: [
    {
      title: 'Welcome',
      type: 'content',
      content: 'This is a simple test app without Firebase.',
    }
  ],
  settings: {
    appName: 'Simple Test',
    version: '1.0.0',
    theme: {
      primaryColor: '0xFF4CAF50'
    }
  }
};

console.log('Testing simple app generator...');
generateApp(simpleConfig).then(result => {
  console.log('Result:', JSON.stringify(result, null, 2));
}).catch(error => {
  console.error('Error:', error);
}); 