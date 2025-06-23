const { generateApp } = require('./generate_flutter_app.js');

const fullConfig = {
  appName: 'Full Test App',
  pages: [
    {
      title: 'Welcome',
      type: 'content',
      content: 'Welcome to our full-featured test app with Firebase support!',
    },
    {
      title: 'Contact Form',
      type: 'form',
      content: JSON.stringify({
        fields: [
          { label: 'Name', type: 'text' },
          { label: 'Email', type: 'email' },
          { label: 'Message', type: 'text' }
        ]
      }),
    },
    {
      title: 'Features',
      type: 'list',
      content: JSON.stringify({
        items: [
          'Firebase Authentication',
          'Cloud Firestore',
          'Firebase Storage',
          'Local Storage',
          'Admin Panel'
        ]
      }),
    }
  ],
  settings: {
    appName: 'Full Test App',
    version: '1.0.0',
    theme: {
      primaryColor: '0xFF2196F3'
    }
  }
};

console.log('Testing full-featured app generator...');
generateApp(fullConfig).then(result => {
  console.log('Result:', JSON.stringify(result, null, 2));
}).catch(error => {
  console.error('Error:', error);
}); 