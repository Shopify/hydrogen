#!/usr/bin/env node

import {spawn} from 'child_process';
import {watch} from 'fs';
import {join, dirname} from 'path';
import {fileURLToPath} from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

// Start the Express server
const server = spawn('npm', ['run', 'dev:server'], {
  stdio: 'inherit',
  shell: true,
  cwd: rootDir,
});

// Run initial type generation with --watch flag to avoid WebSocket conflicts
console.log('🔄 Generating React Router types...');
const initialTypegen = spawn('npx', ['react-router', 'typegen'], {
  stdio: ['inherit', 'inherit', 'pipe'], // Pipe stderr to suppress WebSocket warnings
  shell: true,
  cwd: rootDir,
});

// Filter out WebSocket errors from stderr
initialTypegen.stderr?.on('data', (data) => {
  const message = data.toString();
  if (!message.includes('WebSocket server error')) {
    process.stderr.write(data);
  }
});

initialTypegen.on('close', () => {
  console.log('✅ Initial types generated');
  
  // Show dev server URL
  const port = process.env.PORT || 3000;
  console.log('\n🚀 Express server ready!\n');
  console.log(`  ➜  Local:   http://localhost:${port}`);
  console.log(`  ➜  Network: use --host to expose\n`);
});

// Watch for route changes
const routesDir = join(rootDir, 'app', 'routes');
const routesFile = join(rootDir, 'app', 'routes.ts');

console.log('👀 Watching for route changes...');

let typegenTimeout;
const runTypegen = () => {
  clearTimeout(typegenTimeout);
  typegenTimeout = setTimeout(() => {
    console.log('🔄 Route change detected, regenerating types...');
    const typegen = spawn('npx', ['react-router', 'typegen'], {
      stdio: ['inherit', 'inherit', 'pipe'],
      shell: true,
      cwd: rootDir,
    });
    
    // Filter out WebSocket errors
    typegen.stderr?.on('data', (data) => {
      const message = data.toString();
      if (!message.includes('WebSocket server error')) {
        process.stderr.write(data);
      }
    });
    
    typegen.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Types regenerated');
      } else {
        console.error('❌ Type generation failed');
      }
    });
  }, 500); // Debounce for 500ms
};

// Watch routes directory
watch(routesDir, {recursive: true}, (eventType, filename) => {
  if (filename && (filename.endsWith('.tsx') || filename.endsWith('.ts'))) {
    runTypegen();
  }
});

// Watch routes.ts file
watch(routesFile, () => {
  runTypegen();
});

// Handle cleanup
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  server.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  server.kill();
  process.exit(0);
});