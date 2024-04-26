import { readdir } from 'node:fs/promises';
import { AbortError } from '@shopify/cli-kit/node/error';
import { copyFile, fileExists } from '@shopify/cli-kit/node/fs';
import { readAndParsePackageJson } from '@shopify/cli-kit/node/node-package-manager';
import { joinPath } from '@shopify/cli-kit/node/path';
import { renderTasks, renderInfo } from '@shopify/cli-kit/node/ui';
import { downloadExternalRepo, downloadMonorepoTemplates } from '../template-downloader.js';
import { applyTemplateDiff } from '../template-diff.js';
import { getCliCommand } from '../shell.js';
import { createAbortHandler, handleProjectLocation, handleLanguage, createInitialCommit, handleDependencies, commitAll, renderProjectReady } from './common.js';

const DEMO_STORE_REPO = "shopify/hydrogen-demo-store";
async function setupRemoteTemplate(options, controller) {
  const appTemplate = options.template === "demo-store" ? DEMO_STORE_REPO : options.template;
  let abort = createAbortHandler(controller);
  const backgroundDownloadPromise = appTemplate.includes("/") ? getExternalTemplate(appTemplate, controller.signal).catch(abort) : getMonorepoTemplate(appTemplate, controller.signal).catch(abort);
  const project = await handleProjectLocation({ ...options, controller });
  if (!project)
    return;
  abort = createAbortHandler(controller, project);
  const downloaded = await backgroundDownloadPromise;
  if (controller.signal.aborted)
    return;
  let backgroundWorkPromise = Promise.resolve().then(async () => {
    if (controller.signal.aborted)
      return;
    const { sourcePath, skeletonPath } = downloaded;
    const pkgJson = await readAndParsePackageJson(
      joinPath(sourcePath, "package.json")
    );
    if (pkgJson.scripts?.dev?.includes("--diff")) {
      return applyTemplateDiff(project.directory, sourcePath, skeletonPath);
    }
    return copyFile(sourcePath, project.directory);
  }).catch(abort);
  const supportsTranspilation = await fileExists(
    joinPath(downloaded.sourcePath, "tsconfig.json")
  );
  const { language, transpileProject } = supportsTranspilation ? await handleLanguage(project.directory, controller, options.language) : { language: "js", transpileProject: () => Promise.resolve() };
  backgroundWorkPromise = backgroundWorkPromise.then(() => transpileProject().catch(abort)).then(
    () => options.git ? createInitialCommit(project.directory) : void 0
  );
  const { packageManager, shouldInstallDeps, installDeps } = await handleDependencies(
    project.directory,
    controller,
    options.packageManager,
    options.installDeps
  );
  const setupSummary = {
    language,
    packageManager,
    depsInstalled: false,
    cliCommand: await getCliCommand("", packageManager)
  };
  const tasks = [
    {
      title: "Downloading template",
      task: async () => {
        await backgroundDownloadPromise;
      }
    },
    {
      title: "Setting up project",
      task: async () => {
        await backgroundWorkPromise;
      }
    }
  ];
  if (shouldInstallDeps) {
    tasks.push({
      title: "Installing dependencies. This could take a few minutes",
      task: async () => {
        try {
          await installDeps();
          setupSummary.depsInstalled = true;
        } catch (error) {
          setupSummary.depsError = error;
        }
      }
    });
  }
  if (controller.signal.aborted)
    return;
  await renderTasks(tasks);
  if (options.git) {
    await commitAll(project.directory, "Lockfile");
  }
  await renderProjectReady(project, setupSummary);
  renderInfo({
    headline: `Your project will display inventory from ${options.template.endsWith(DEMO_STORE_REPO) ? "the Hydrogen Demo Store" : "Mock.shop"}.`,
    body: `To connect this project to your Shopify store\u2019s inventory, update \`${project.name}/.env\` with your store ID and Storefront API key.`
  });
  return {
    ...project,
    ...setupSummary
  };
}
async function getExternalTemplate(appTemplate, signal) {
  const { templateDir } = await downloadExternalRepo(appTemplate, signal);
  return { sourcePath: templateDir };
}
async function getMonorepoTemplate(appTemplate, signal) {
  const { templatesDir, examplesDir } = await downloadMonorepoTemplates({
    signal
  });
  const skeletonPath = joinPath(templatesDir, "skeleton");
  const templatePath = joinPath(templatesDir, appTemplate);
  const examplePath = joinPath(examplesDir, appTemplate);
  if (await fileExists(templatePath)) {
    return { skeletonPath, sourcePath: templatePath };
  }
  if (await fileExists(examplePath)) {
    return { skeletonPath, sourcePath: examplePath };
  }
  const availableTemplates = (await Promise.all([readdir(examplesDir), readdir(templatesDir)]).catch(
    () => []
  )).flat().filter((name) => name !== "skeleton" && !name.endsWith(".md")).concat("demo-store").sort();
  throw new AbortError(
    `Unknown value in \`--template\` flag "${appTemplate}".
Skip the flag or provide the name of a template or example in the Hydrogen repository or a URL to a git repository.`,
    availableTemplates.length === 0 ? "" : { list: { title: "Available templates:", items: availableTemplates } }
  );
}

export { setupRemoteTemplate };
