#!/usr/bin/env -S node --experimental-import-meta-resolve

/**
 * This scripts patches Shopify CLI to add a Node experimental flag required by MiniOxygen
 */

import path from 'path';
import fs from 'fs/promises';
import {fileURLToPath} from 'url';

try {
  // @shopify/cli/dist/
  const cliPkgPath = path.dirname(
    fileURLToPath(await import.meta.resolve('@shopify/cli')),
  );

  // --- Add temporary CLI plugin name to package.json
  // @shopify/cli/package.json
  const pkgFilePath = path.join(cliPkgPath, '..', 'package.json');
  const pkgContent = await fs.readFile(pkgFilePath, 'utf-8');
  await fs.writeFile(
    pkgFilePath,
    // Add flag at the end of the shebang and -S param to support Linux (CI)
    pkgContent.replace('"@shopify/cli-hydrogen"', '"@shopify/cli-h2-test"'),
    'utf-8',
  );
} catch (error) {
  console.warn(
    'Shopify CLI could not be patched. This might generate issues when running MiniOxygen.\n',
    error.message + '\n',
    error.stack,
  );
}
