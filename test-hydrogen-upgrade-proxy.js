#!/usr/bin/env node

/**
 * Hydrogen Upgrade Proxy Tester
 * 
 * This script allows you to test the `hydrogen upgrade` command with a custom changelog
 * by intercepting requests to hydrogen.shopify.dev and serving a local or GitHub-hosted changelog.
 * 
 * REQUIREMENTS:
 * 1. Node.js (v18+)
 * 2. mitmproxy installed: `brew install --cask mitmproxy`
 * 
 * USAGE:
 *   node test-hydrogen-upgrade-proxy.js [--changelogUrl <url>] [--path <target-repo>]
 * 
 * EXAMPLES:
 *   # Use local changelog from current branch
 *   node test-hydrogen-upgrade-proxy.js --path ../my-hydrogen-app
 * 
 *   # Use remote changelog
 *   node test-hydrogen-upgrade-proxy.js --changelogUrl https://github.com/Shopify/hydrogen/blob/abc123/docs/changelog.json
 * 
 *   # Remote changelog with target repo setup
 *   node test-hydrogen-upgrade-proxy.js --changelogUrl https://github.com/Shopify/hydrogen/blob/abc123/docs/changelog.json --path ../my-hydrogen-app
 * 
 * The script automatically:
 * - Uses local changelog if no URL provided
 * - Converts GitHub blob URLs to raw format
 * - Sets up a test script in the target repo (if --path is provided)
 */

const http = require('http');
const https = require('https');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const PROXY_PORT = 8888;
const SERVER_PORT = 3333;

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  let changelogUrl = null;
  let targetPath = null;
  
  for (let i = 0; i < args.length; i++) {
    if ((args[i] === '--changelogUrl' || args[i] === '--changelog') && args[i + 1]) {
      changelogUrl = args[i + 1];
      i++;
    } else if (args[i] === '--path' && args[i + 1]) {
      targetPath = args[i + 1];
      i++;
    } else if (args[i].startsWith('https://')) {
      // Backward compatibility
      changelogUrl = args[i];
    }
  }
  
  // Check environment variable as fallback
  if (!changelogUrl) {
    changelogUrl = process.env.CHANGELOG_URL;
  }
  
  return { changelogUrl, targetPath };
}

const { changelogUrl, targetPath } = parseArgs();

// Validate and process changelog source
let changelogSource;
if (changelogUrl && changelogUrl.includes('github.com') && changelogUrl.includes('/blob/')) {
  const convertedUrl = changelogUrl
    .replace('github.com', 'raw.githubusercontent.com')
    .replace('/blob/', '/');
  console.log('📝 Converted GitHub URL to raw format:', convertedUrl);
  changelogSource = { type: 'remote', url: convertedUrl };
} else if (changelogUrl) {
  changelogSource = { type: 'remote', url: changelogUrl };
} else {
  // Use local changelog
  const localChangelogPath = path.join(__dirname, 'docs', 'changelog.json');
  if (!fs.existsSync(localChangelogPath)) {
    console.error('❌ Local changelog.json not found at:', localChangelogPath);
    console.error('   Make sure you run this script from the Hydrogen monorepo root.');
    process.exit(1);
  }
  console.log('📝 Using local changelog from current branch');
  changelogSource = { type: 'local', path: localChangelogPath };
}

// Create the changelog server
const server = http.createServer((req, res) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  
  if (req.url === '/changelog.json') {
    if (changelogSource.type === 'local') {
      console.log('✅ Serving local changelog from:', changelogSource.path);
      const content = fs.readFileSync(changelogSource.path, 'utf8');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(content);
    } else {
      console.log('✅ Serving remote changelog from:', changelogSource.url);
      https.get(changelogSource.url, (githubRes) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        githubRes.pipe(res);
      }).on('error', (err) => {
        console.error('❌ Error fetching changelog:', err);
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
      });
    }
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

// Create mitmproxy redirect script
const mitmproxyScript = `
"""
Mitmproxy script to redirect hydrogen.shopify.dev/changelog.json
to our local server
"""
from mitmproxy import http

def request(flow: http.HTTPFlow) -> None:
    if flow.request.pretty_host == "hydrogen.shopify.dev" and "changelog.json" in flow.request.path:
        print(f"🎯 Intercepting request to {flow.request.pretty_url}")
        # Redirect to our local server
        flow.request.host = "localhost"
        flow.request.port = ${SERVER_PORT}
        flow.request.scheme = "http"
        print(f"✅ Redirected to http://localhost:${SERVER_PORT}/changelog.json")
`;

const mitmproxyScriptPath = path.join(__dirname, '.mitmproxy-redirect-temp.py');
fs.writeFileSync(mitmproxyScriptPath, mitmproxyScript);

// Global variable to store mitmproxy process
let mitmproxyProcess = null;

// Cleanup function
function cleanup() {
  console.log('\n🧹 Cleaning up...');
  
  if (mitmproxyProcess && !mitmproxyProcess.killed) {
    mitmproxyProcess.kill();
  }
  
  if (fs.existsSync(mitmproxyScriptPath)) {
    fs.unlinkSync(mitmproxyScriptPath);
  }
  
  if (server.listening) {
    server.close();
  }
  
  process.exit(0);
}

// Handle exit signals
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Setup target repo if path provided
function setupTargetRepo(targetPath) {
  const absolutePath = path.resolve(targetPath);
  
  if (!fs.existsSync(absolutePath)) {
    console.error(`❌ Target path does not exist: ${absolutePath}`);
    return false;
  }
  
  // Create the h2-test-upgrade script
  const scriptContent = `#!/bin/bash
# Hydrogen test upgrade wrapper

# Check if proxy is running
if ! curl -s http://localhost:8888 > /dev/null 2>&1; then
  echo "❌ Proxy not running. Start it first in the Hydrogen repo:"
  echo "   npm run test:upgrade -- --path ${targetPath}"
  echo "   Or with a specific changelog:"
  echo "   npm run test:upgrade -- --changelogUrl https://github.com/Shopify/hydrogen/blob/COMMIT/docs/changelog.json --path ${targetPath}"
  exit 1
fi

# Run hydrogen upgrade with proxy
SHOPIFY_HTTP_PROXY=http://localhost:8888 \\
FORCE_CHANGELOG_SOURCE=remote \\
NODE_TLS_REJECT_UNAUTHORIZED=0 \\
npx @shopify/cli@latest hydrogen upgrade --force "$@"
`;
  
  const scriptPath = path.join(absolutePath, 'h2-test-upgrade');
  fs.writeFileSync(scriptPath, scriptContent);
  fs.chmodSync(scriptPath, '755');
  
  console.log(`✅ Created ${scriptPath}`);
  
  // Check if .gitignore exists and add the script to it
  const gitignorePath = path.join(absolutePath, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
    if (!gitignoreContent.includes('h2-test-upgrade')) {
      fs.appendFileSync(gitignorePath, '\n# Hydrogen test upgrade script\nh2-test-upgrade\n');
      console.log(`✅ Added h2-test-upgrade to .gitignore`);
    }
  }
  
  return true;
}

// Start the server
server.listen(SERVER_PORT, () => {
  console.log(`\n✅ Changelog server running on http://localhost:${SERVER_PORT}`);
  console.log(`📄 Changelog source: ${changelogSource.type === 'local' ? 'Local file' : changelogSource.url}`);
  
  // Setup target repo if path provided
  if (targetPath) {
    console.log(`\n📁 Setting up target repository: ${targetPath}`);
    setupTargetRepo(targetPath);
  }
  
  // Test the server
  http.get(`http://localhost:${SERVER_PORT}/changelog.json`, (res) => {
    if (res.statusCode === 200) {
      console.log('✅ Server test successful');
    } else {
      console.error('❌ Server test failed with status:', res.statusCode);
    }
  });
  
  // Check if mitmproxy is installed
  const checkMitmproxy = spawn('which', ['mitmdump']);
  checkMitmproxy.on('close', (code) => {
    if (code !== 0) {
      console.error('\n❌ mitmproxy not found. Please install it:');
      console.error('   brew install --cask mitmproxy');
      cleanup();
      return;
    }
    
    // Start mitmproxy
    console.log(`\n🚀 Starting mitmproxy on port ${PROXY_PORT}...`);
    mitmproxyProcess = spawn('mitmdump', [
      '-s', mitmproxyScriptPath,
      '--mode', `regular@${PROXY_PORT}`,
      '--set', 'confdir=~/.mitmproxy-hydrogen-test'
    ]);
    
    mitmproxyProcess.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('HTTP(S) proxy listening')) {
        console.log(`✅ Proxy ready on port ${PROXY_PORT}`);
        showInstructions();
      }
    });
    
    mitmproxyProcess.stderr.on('data', (data) => {
      const error = data.toString();
      if (error.includes('Address already in use')) {
        console.error(`\n❌ Port ${PROXY_PORT} is already in use.`);
        console.error('   Please stop any other proxy servers and try again.');
        cleanup();
      } else if (!error.includes('Loading script')) {
        console.error('Proxy error:', error);
      }
    });
    
    mitmproxyProcess.on('close', (code) => {
      if (code !== 0 && code !== null) {
        console.error('❌ mitmproxy exited with code:', code);
        cleanup();
      }
    });
  });
});

function showInstructions() {
  console.log('\n' + '='.repeat(80));
  console.log('🎉 Proxy is ready!');
  console.log('='.repeat(80));
  
  if (changelogSource.type === 'local') {
    console.log('\n📄 Using local changelog from current branch');
  } else {
    console.log('\n📄 Using changelog: ' + changelogUrl);
  }
  
  if (targetPath) {
    const absolutePath = path.resolve(targetPath);
    console.log('📝 Target repository is ready: ' + absolutePath);
    console.log('\nIn your target app directory, run:');
    console.log('  ./h2-test-upgrade');
    console.log('  ./h2-test-upgrade --version 2025.5.0');
    console.log('\n⚠️  Note: The script runs with --force to bypass git checks');
  } else {
    console.log('\n📝 No target repository specified.');
    console.log('\nTo set up a target app:');
    if (changelogSource.type === 'local') {
      console.log('  Restart with: npm run test:upgrade -- --path ../your-app');
    } else {
      console.log('  Restart with: npm run test:upgrade -- --changelogUrl ' + changelogUrl + ' --path ../your-app');
    }
    console.log('\nOr run manually in your app:');
    console.log('  SHOPIFY_HTTP_PROXY=http://localhost:8888 \\');
    console.log('  FORCE_CHANGELOG_SOURCE=remote \\');
    console.log('  NODE_TLS_REJECT_UNAUTHORIZED=0 \\');
    console.log('  npx @shopify/cli@latest hydrogen upgrade');
  }
  
  console.log('\n💡 Proxy activity will appear in this terminal');
  console.log('   Press Ctrl+C to stop\n');
  console.log('='.repeat(80));
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Port ${SERVER_PORT} is already in use.`);
    console.error('   Please stop any other servers and try again.');
  } else {
    console.error('Server error:', err);
  }
  cleanup();
});