#!/usr/bin/env node

/**
 * Transform file for jscodeshift
 * This is the entry point when running the codemod via jscodeshift
 */

const fs = require('fs');
const path = require('path');

// jscodeshift requires synchronous exports, but our module is ESM
// We need to use a different approach
module.exports = function transformer(fileInfo, api, options) {
  const distPath = path.join(__dirname, 'dist', 'index.js');
  
  // Check if dist exists, if not try to use src directly (development mode)
  if (fs.existsSync(distPath)) {
    // Production: use compiled JavaScript
    const transformerModule = require('./dist/index.js');
    const transform = transformerModule.default || transformerModule;
    return transform(fileInfo, api, options);
  } else {
    // Development: use TypeScript directly
    // This requires ts-node or similar to be set up
    console.error('Error: dist/index.js not found. Please run "npm run build" first.');
    console.error('Run: cd codemods/hydrogen-react-router-migration && npm install && npm run build');
    process.exit(1);
  }
};

// Export the parser to use
module.exports.parser = 'tsx';