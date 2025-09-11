#!/usr/bin/env node

/**
 * Transform file for jscodeshift
 * This is the entry point when running the codemod via jscodeshift
 */

// jscodeshift requires synchronous exports, but our module is ESM
// We need to use a different approach
module.exports = function transformer(fileInfo, api, options) {
  // Since jscodeshift doesn't support async transformers directly,
  // we need to load the compiled JavaScript synchronously
  const transformerModule = require('./dist/index.js');
  const transform = transformerModule.default || transformerModule;
  
  return transform(fileInfo, api, options);
};

// Export the parser to use
module.exports.parser = 'tsx';