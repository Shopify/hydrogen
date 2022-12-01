import {resolve} from 'path';
import fs from 'fs-extra';
import {createApp} from "@remix-run/dev";

(async () => {
  const [template] = process.argv.slice(2);
  const source = resolve(process.cwd(), 'templates');
  const templateDir = `${source}/${template}`;
  const tsTemplateDir = `${templateDir}-ts`;
  const jsTemplateDir = `${templateDir}-js`;

  await createNewApp(templateDir, tsTemplateDir, true);
  await createNewApp(templateDir, jsTemplateDir, false);
  fs.removeSync(templateDir);

  await fixConfig(tsTemplateDir, 'tsconfig.json');
  await fixConfig(jsTemplateDir, 'jsconfig.json');

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

async function fixConfig(dir, filename) {
  // Update node_modules override for dist
  let config = await fs.readFile(resolve(dir, filename), 'utf8');
  config = config.replaceAll('../../node_modules', 'node_modules');
  await fs.writeFile(resolve(dir, filename), config);
}
