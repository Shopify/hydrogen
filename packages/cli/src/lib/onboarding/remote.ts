import {AbortError} from '@shopify/cli-kit/node/error';
import {AbortController, AbortSignal} from '@shopify/cli-kit/node/abort';
import {copyFile, fileExists} from '@shopify/cli-kit/node/fs';
import {joinPath} from '@shopify/cli-kit/node/path';
import {renderInfo, renderTasks} from '../ui.js';
import {downloadExternalRepo} from '../template-downloader.js';
import {getCliCommand} from '../shell.js';
import {
  commitAll,
  createAbortHandler,
  createInitialCommit,
  handleDependencies,
  handleLanguage,
  handleProjectLocation,
  renderProjectReady,
  SetupSummary,
  type InitOptions,
} from './common.js';

const DEMO_STORE_REPO = 'shopify/hydrogen-demo-store';

/**
 * Flow for creating a project starting from a remote template (e.g. demo-store).
 */
export async function setupRemoteTemplate(
  options: InitOptions & Required<Pick<InitOptions, 'template'>>,
  controller: AbortController,
) {
  const appTemplate =
    options.template === 'demo-store' ? DEMO_STORE_REPO : options.template;

  // IMPORTANT: We must await handleProjectLocation BEFORE starting the template download.
  // This ensures the abort handler has the project directory information needed for cleanup.
  // Starting the download before having project info can cause a race condition where:
  // 1. An unknown template throws an error
  // 2. The abort handler tries to clean up but doesn't have the directory to delete
  // 3. handleProjectLocation creates the directory
  // 4. The abort handler (now with project info) deletes it
  // 5. handleProjectLocation continues and tries to read the deleted directory -> ENOENT error
  const project = await handleProjectLocation({...options, controller});

  if (!project) return;

  const abort = createAbortHandler(controller, project);

  // Start downloading templates after we have project location.
  const backgroundDownloadPromise = appTemplate.includes('/')
    ? getExternalTemplate(appTemplate, controller.signal).catch(abort)
    : rejectUnknownTemplate(appTemplate).catch(abort);

  const downloaded = await backgroundDownloadPromise;
  if (controller.signal.aborted) return;

  let backgroundWorkPromise = Promise.resolve()
    .then(async () => {
      // Result is undefined in certain tests,
      // do not continue if it's already aborted
      if (controller.signal.aborted) return;

      const {sourcePath} = downloaded;

      // Always copy the entire template/example
      await copyFile(sourcePath, project.directory);
    })
    .catch(abort);

  const supportsTranspilation = await fileExists(
    joinPath(downloaded.sourcePath, 'tsconfig.json'),
  );

  const {language, transpileProject} = supportsTranspilation
    ? await handleLanguage(project.directory, controller, options.language)
    : {language: 'js' as const, transpileProject: () => Promise.resolve()};

  backgroundWorkPromise = backgroundWorkPromise
    .then(() => transpileProject().catch(abort))
    .then(() =>
      options.git ? createInitialCommit(project.directory) : undefined,
    );

  const {packageManager, shouldInstallDeps, installDeps} =
    await handleDependencies(
      project.directory,
      controller,
      options.packageManager,
      options.installDeps,
    );

  const setupSummary: SetupSummary = {
    language,
    packageManager,
    depsInstalled: false,
    cliCommand: await getCliCommand('', packageManager),
  };

  const tasks = [
    {
      title: 'Downloading template',
      task: async () => {
        await backgroundDownloadPromise;
      },
    },
    {
      title: 'Setting up project',
      task: async () => {
        await backgroundWorkPromise;
      },
    },
  ];

  if (shouldInstallDeps) {
    tasks.push({
      title: 'Installing dependencies. This could take a few minutes',
      task: async () => {
        try {
          await installDeps();
          setupSummary.depsInstalled = true;
        } catch (error) {
          setupSummary.depsError = error as AbortError;
        }
      },
    });
  }

  if (controller.signal.aborted) return;

  await renderTasks(tasks);

  if (options.git) {
    await commitAll(project.directory, 'Lockfile');
  }

  await renderProjectReady(project, setupSummary);

  renderInfo({
    headline: `Your project will display inventory from ${
      options.template.endsWith(DEMO_STORE_REPO)
        ? 'the Hydrogen Demo Store'
        : 'Mock.shop'
    }.`,
    body: `To connect this project to your Shopify store’s inventory, update \`${project.name}/.env\` with your store ID and Storefront API key.`,
  });

  return {
    ...project,
    ...setupSummary,
  };
}

type DownloadedTemplate = {
  sourcePath: string;
};

async function getExternalTemplate(
  appTemplate: string,
  signal: AbortSignal,
): Promise<DownloadedTemplate> {
  const {templateDir} = await downloadExternalRepo(appTemplate, signal);
  return {sourcePath: templateDir};
}

async function rejectUnknownTemplate(appTemplate: string): Promise<never> {
  throw new AbortError(
    `Unknown value in \`--template\` flag "${appTemplate}".\nSkip the flag or provide the name of a template or a URL to a git repository.`,
    {
      list: {
        title: 'Available templates:',
        // Note: skeleton uses the local starter flow, and demo-store is
        // handled as an external template
        items: ['skeleton', 'demo-store'],
      },
    },
  );
}
