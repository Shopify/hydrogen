// Script to check that all virtual routes are built or copied.

import {glob} from '@shopify/cli-kit/node/fs';

const virtualRoutesGlob = 'virtual-routes/**/*';

const srcEntries = await glob(virtualRoutesGlob, {
  cwd: new URL('../../hydrogen/src/vite', import.meta.url).pathname,
});
const distEntries = await glob(virtualRoutesGlob, {
  cwd: new URL('../dist/assets/hydrogen', import.meta.url).pathname,
});

for (const srcEntry of srcEntries) {
  // skip .DS_Store files
  if (srcEntry.endsWith('.DS_Store')) continue;

  const distEntry = srcEntry.replace('src', 'dist').replace('.ts', '.js');
  if (!distEntries.includes(distEntry)) {
    throw new Error('CLI build check failed! Missing: ' + distEntry);
  }
}

console.log(
  `CLI build checked successfully! Found ${srcEntries.length} files in virtual-routes.`,
);
