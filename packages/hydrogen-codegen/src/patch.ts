import path from 'node:path';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const require = createRequire(import.meta.url);
const realGqlTagPluck = require.resolve('@graphql-tools/graphql-tag-pluck');
// During tests, this file is in src/xyz.ts but in dev/prod,
// the file is in dist/(esm|cjs)/xyz.js
const depth = path.extname(import.meta.url) === '.ts' ? '../' : '../../';
const vendorGqlTagPluck = fileURLToPath(
  new URL(depth + '/vendor/graphql-tag-pluck', import.meta.url),
);

// Copy files sequencially to avoid `EBUSY` errors in Windows
await fs.copyFile(
  path.join(vendorGqlTagPluck, 'visitor.cjs'),
  realGqlTagPluck.replace(/index\.js$/, 'visitor.js'),
);

await fs.copyFile(
  path.join(vendorGqlTagPluck, 'visitor.mjs'),
  realGqlTagPluck.replace('cjs', 'esm').replace(/index\.js$/, 'visitor.js'),
);
