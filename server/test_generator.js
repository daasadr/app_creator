const { generateApp } = require('./generate_flutter_app.js');

const testConfig = {
  appName: 'Test App',
  pages: [
    {
      title: 'Home',
      type: 'content',
      content: 'Test content for the home page',
      imageUrl: 'https://picsum.photos/400/200'
    },
    {
      title: 'About',
      type: 'detail',
      content: {
        title: 'About Us',
        description: 'This is a test app generated from our template.',
        imageUrl: 'https://picsum.photos/400/200'
      }
    }
  ],
  settings: {
    appName: 'Test App',
    version: '1.0.0',
    theme: {
      primaryColor: '0xFF2196F3'
    }
  }
};

console.log('Testing app generator...');
generateApp(testConfig).then(result => {
  console.log('Result:', JSON.stringify(result, null, 2));
}).catch(error => {
  console.error('Error:', error);
}); 