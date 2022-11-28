import {resolve} from 'path';
import fs from 'fs-extra';
import {createApp} from "@remix-run/dev";

(async () => {
  const [template] = process.argv.slice(2);
  const source = resolve(process.cwd(), 'templates');
  const templateDir = `${source}/${template}`;

  await createNewApp(templateDir, `${templateDir}-ts`, true);
  await createNewApp(templateDir, `${templateDir}-js`, false);
  fs.removeSync(`${source}/${template}`);
})();

async function createNewApp(srcDir, destDir, useTypeScript) {
  await createApp({
    appTemplate: srcDir,
    installDeps: false,
    useTypeScript,
    projectDir: destDir,
  });
}
