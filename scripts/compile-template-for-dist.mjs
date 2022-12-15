import {resolve} from 'path';
import fs from 'fs-extra';
import {createApp} from '@remix-run/dev';

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

  // .hydrogen folder resulted from createApp
  fs.removeSync('.hydrogen');
})();

async function createNewApp(srcDir, destDir, useTypeScript) {
  await createApp({
    appTemplate: srcDir,
    installDeps: false,
    useTypeScript,
    projectDir: destDir,
  });
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
