import {readFile, readdir} from 'node:fs/promises';
import {join} from 'node:path';

/**
 * Loads the content of a recipe patch file by prefix match.
 * Patch filenames include a hash suffix (e.g. `vite.config.ts.abc123.patch`),
 * so callers match by the stable prefix (e.g. `vite.config.ts`).
 */
export async function loadRecipePatch(
  recipeDir: string,
  filePrefix: string,
): Promise<string> {
  const files = await readdir(join(recipeDir, 'patches'));
  const match = files.find((f) => f.startsWith(filePrefix));
  if (!match) {
    throw new Error(
      `Expected ${filePrefix} patch file in patches/. Found: [${files.join(', ')}]`,
    );
  }
  return readFile(join(recipeDir, 'patches', match), 'utf8');
}
