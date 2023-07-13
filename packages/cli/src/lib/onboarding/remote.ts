import {AbortError} from '@shopify/cli-kit/node/error';
import {AbortController} from '@shopify/cli-kit/node/abort';
import {copyFile} from '@shopify/cli-kit/node/fs';
import {joinPath} from '@shopify/cli-kit/node/path';
import {renderInfo, renderTasks} from '@shopify/cli-kit/node/ui';
import {getLatestTemplates} from '../template-downloader.js';
import {
  createAbortHandler,
  createInitialCommit,
  handleDependencies,
  handleLanguage,
  handleProjectLocation,
  renderProjectReady,
  SetupSummary,
  type InitOptions,
} from './common.js';

/**
 * Flow for creating a project starting from a remote template (e.g. demo-store).
 */
export async function setupRemoteTemplate(
  options: InitOptions,
  controller: AbortController,
) {
  const isOfficialTemplate =
    options.template === 'demo-store' || options.template === 'hello-world';

  if (!isOfficialTemplate) {
    // TODO: support GitHub repos as templates
    throw new AbortError(
      'Only `demo-store` and `hello-world` are supported in --template flag for now.',
      'Skip the --template flag to run the setup flow.',
    );
  }

  const appTemplate = options.template!;

  // Start downloading templates early.
  const backgroundDownloadPromise = getLatestTemplates({
    signal: controller.signal,
  }).catch((error) => {
    throw abort(error); // Throw to fix TS error
  });

  const project = await handleProjectLocation({...options, controller});

  if (!project) return;

  const abort = createAbortHandler(controller, project);

  let backgroundWorkPromise = backgroundDownloadPromise.then(({templatesDir}) =>
    copyFile(joinPath(templatesDir, appTemplate), project.directory).catch(
      abort,
    ),
  );

  const {language, transpileProject} = await handleLanguage(
    project.directory,
    controller,
    options.language,
  );

  backgroundWorkPromise = backgroundWorkPromise
    .then(() => transpileProject().catch(abort))
    .then(() => createInitialCommit(project.directory));

  const {packageManager, shouldInstallDeps, installDeps} =
    await handleDependencies(
      project.directory,
      controller,
      options.installDeps,
    );

  const setupSummary: SetupSummary = {
    language,
    packageManager,
    depsInstalled: false,
    hasCreatedShortcut: false,
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
      title: 'Installing dependencies',
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

  await renderTasks(tasks);

  await renderProjectReady(project, setupSummary);

  if (isOfficialTemplate) {
    renderInfo({
      headline: `Your project will display inventory from the Hydrogen Demo Store.`,
      body: `To connect this project to your Shopify store’s inventory, update \`${project.name}/.env\` with your store ID and Storefront API key.`,
    });
  }
}
