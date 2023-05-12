import {resolve} from 'path';
import fs from 'fs-extra';
import {transpileProject} from '../packages/cli/dist/lib/transpile-ts.js';

(async () => {
  const [template, ...flags] = process.argv.slice(2);
  const shouldKeepOriginalTemplate = flags.includes('--keep');
  const source = resolve(process.cwd(), 'templates');
  const templateDir = `${source}/${template}`;
  const tsTemplateDir = `${templateDir}-ts`;
  const jsTemplateDir = `${templateDir}-js`;

  await createNewApp(templateDir, tsTemplateDir, true);
  await createNewApp(templateDir, jsTemplateDir, false);
  if (!shouldKeepOriginalTemplate) {
    fs.removeSync(templateDir);
  }

  removeUnwantedFiles(tsTemplateDir);
  removeUnwantedFiles(jsTemplateDir);
})();

async function createNewApp(srcDir, destDir, useTypeScript) {
  await fs.copy(srcDir, destDir);
  if (!useTypeScript) {
    await transpileProject(destDir);
  }
}

function removeUnwantedFiles(dir) {
  const filesAndDirs = [
    // Only used in monorepo
    '.turbo',
  ];

  for (const fileOrDir of filesAndDirs) {
    const filePath = resolve(dir, fileOrDir);
    if (fs.existsSync(filePath)) {
      fs.removeSync(filePath);
    }
  }
}
