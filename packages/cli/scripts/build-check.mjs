// Script to check that all virtual routes are built or copied.

import glob from 'fast-glob';

const virtualRoutesGlob = '/virtual-routes/**/*';
const cwd = new URL('..', import.meta.url).pathname;

const srcEntries = await glob('src' + virtualRoutesGlob, {cwd});
const distEntries = await glob('dist' + virtualRoutesGlob, {cwd});

for (const srcEntry of srcEntries) {
  const distEntry = srcEntry.replace('src', 'dist').replace('.ts', '.js');
  if (!distEntries.includes(distEntry)) {
    throw new Error('CLI build check failed! Missing: ' + distEntry);
  }
}

console.log(
  `CLI build checked successfully! Found ${srcEntries.length} files in virtual-routes.`,
);
