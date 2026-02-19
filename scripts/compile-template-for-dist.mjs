import {resolve} from 'path';
import fs from 'fs-extra';
import {transpileProject} from '../packages/cli/dist/lib/transpile/index.js';
import {replaceWorkspaceProtocolVersions} from '../packages/cli/dist/lib/template-pack.js';

(async () => {
  const [template, ...flags] = process.argv.slice(2);
  const shouldKeepOriginalTemplate = flags.includes('--keep');
  const source = resolve(process.cwd(), 'templates');
  const templateDir = `${source}/${template}`;
  const tsTemplateDir = `${templateDir}-ts`;
  const jsTemplateDir = `${templateDir}-js`;

  await Promise.all([
    prepareTemplateVariant({
      sourceTemplateDir: templateDir,
      targetTemplateDir: tsTemplateDir,
      useTypeScript: true,
    }),
    prepareTemplateVariant({
      sourceTemplateDir: templateDir,
      targetTemplateDir: jsTemplateDir,
      useTypeScript: false,
    }),
  ]);
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

async function prepareTemplateVariant({
  sourceTemplateDir,
  targetTemplateDir,
  useTypeScript,
}) {
  await createNewApp(sourceTemplateDir, targetTemplateDir, useTypeScript);
  await replaceWorkspaceProtocolVersions({
    sourceTemplateDir,
    targetTemplateDir,
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
