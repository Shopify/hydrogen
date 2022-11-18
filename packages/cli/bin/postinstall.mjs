#!/usr/bin/env node --experimental-import-meta-resolve

/**
 * This scripts patches Shopify CLI to add a Node experimental flag required by MiniOxygen
 */

import path from 'path';
import fs from 'fs/promises';

try {
  const cliPkgPath = path.dirname(
    path.dirname(await import.meta.resolve('@shopify/cli')),
  );

  // @shopify/cli/dist/xyz => @shopify/cli/bin/run.js
  const cliFilePath = path.join(cliPkgPath, 'bin', 'run.js').split(':')[1];

  const content = await fs.readFile(cliFilePath, 'utf-8');
  await fs.writeFile(
    cliFilePath,
    // Add flag at the end of the shebang (first line)
    content.replace('\n', ' --experimental-vm-modules\n'),
    'utf-8',
  );
} catch (error) {
  console.warn(
    'Shopify CLI could not be patched. This might generate issues when running MiniOxygen.\n',
    error.message + '\n',
    error.stack,
  );
}
