#!/usr/bin/env node
import {readFileSync, readdirSync, existsSync} from 'fs';
import {join} from 'path';
import {fileURLToPath} from 'url';

const rootDir = join(fileURLToPath(import.meta.url), '../..');
const expectedPattern = /^~7\.\d+\.\d+$/;
let expectedVersion = null;
let errors = [];

// Find all package.json files
function* findPackageJsons(dir = rootDir, depth = 0) {
  if (depth > 3) return;
  const pkg = join(dir, 'package.json');
  if (existsSync(pkg)) yield pkg;
  
  for (const subdir of ['packages', 'templates', 'examples']) {
    const path = join(dir, subdir);
    if (existsSync(path)) {
      for (const item of readdirSync(path, {withFileTypes: true})) {
        if (item.isDirectory()) yield* findPackageJsons(join(path, item.name), depth + 1);
      }
    }
  }
}

// Validate React Router versions
for (const pkgPath of findPackageJsons()) {
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  for (const deps of [pkg.dependencies, pkg.devDependencies, pkg.peerDependencies]) {
    if (!deps) continue;
    for (const [name, version] of Object.entries(deps)) {
      if (!/^(@react-router\/|react-router)/.test(name)) continue;
      
      if (!expectedPattern.test(version)) {
        errors.push(`❌ Invalid format ${pkgPath}: ${name}@${version} (expected ~x.x.x)`);
      } else if (!expectedVersion) {
        expectedVersion = version;
      } else if (version !== expectedVersion) {
        errors.push(`❌ Version mismatch ${pkgPath}: ${name}@${version} (expected ${expectedVersion})`);
      }
    }
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
} else if (expectedVersion) {
  console.log(`✅ All React Router packages use ${expectedVersion}`);
}