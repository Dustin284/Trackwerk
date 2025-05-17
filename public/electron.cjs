// This is a CommonJS file that loads the ESM module
const path = require('path');
const { pathToFileURL } = require('url');

// Convert the file path to a proper file:// URL
const fileUrl = pathToFileURL(path.join(__dirname, 'electron.js')).href;

// Use dynamic import to load the ESM module
(async () => {
  await import(fileUrl);
})().catch(err => {
  console.error('Failed to load the ESM module:', err);
  process.exit(1);
});

// Entferne den gesamten doppelten Code - wir verwenden nur das, was in electron.js ist
