import Command from '@shopify/cli-kit/node/base-command';
import {
  installNodeModules,
  packageManagerUsedForCreating,
} from '@shopify/cli-kit/node/node-package-manager';
import {
  renderFatalError,
  renderSuccess,
  renderInfo,
  renderSelectPrompt,
  renderTextPrompt,
  renderConfirmationPrompt,
  renderTasks,
} from '@shopify/cli-kit/node/ui';
import {Flags} from '@oclif/core';
import {basename, resolvePath, joinPath} from '@shopify/cli-kit/node/path';
import {
  rmdir,
  copyFile,
  fileExists,
  isDirectory,
} from '@shopify/cli-kit/node/fs';
import {
  outputInfo,
  outputContent,
  outputToken,
} from '@shopify/cli-kit/node/output';
import {
  commonFlags,
  parseProcessFlags,
  flagsToCamelObject,
} from '../../lib/flags.js';
import {transpileProject} from '../../lib/transpile-ts.js';
import {getLatestTemplates} from '../../lib/template-downloader.js';
import {checkHydrogenVersion} from '../../lib/check-version.js';
import {readdir} from 'fs/promises';
import {fileURLToPath} from 'url';

const STARTER_TEMPLATES = ['hello-world', 'demo-store'];
const FLAG_MAP = {f: 'force'} as Record<string, string>;

export default class Init extends Command {
  static description = 'Creates a new Hydrogen storefront.';
  static flags = {
    force: commonFlags.force,
    path: Flags.string({
      description: 'The path to the directory of the new Hydrogen storefront.',
      env: 'SHOPIFY_HYDROGEN_FLAG_PATH',
    }),
    language: Flags.string({
      description: 'Sets the template language to use. One of `js` or `ts`.',
      choices: ['js', 'ts'],
      env: 'SHOPIFY_HYDROGEN_FLAG_LANGUAGE',
    }),
    template: Flags.string({
      description:
        'Sets the template to use. One of `demo-store` or `hello-world`.',
      choices: STARTER_TEMPLATES,
      env: 'SHOPIFY_HYDROGEN_FLAG_TEMPLATE',
    }),
    'install-deps': Flags.boolean({
      description: 'Auto install dependencies using the active package manager',
      env: 'SHOPIFY_HYDROGEN_FLAG_INSTALL_DEPS',
      allowNo: true,
    }),
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(Init);

    await runInit(flagsToCamelObject(flags));
  }
}

export async function runInit(
  options: {
    path?: string;
    template?: string;
    language?: string;
    token?: string;
    force?: boolean;
    installDeps?: boolean;
  } = parseProcessFlags(process.argv, FLAG_MAP),
) {
  supressNodeExperimentalWarnings();

  const showUpgrade = await checkHydrogenVersion(
    // Resolving the CLI package from a local directory might fail because
    // this code could be run from a global dependency (e.g. on `npm create`).
    // Therefore, pass the known path to the package.json directly from here:
    fileURLToPath(new URL('../../../package.json', import.meta.url)),
    'cli',
  );

  if (showUpgrade) {
    const packageManager = await packageManagerUsedForCreating();
    showUpgrade(
      packageManager === 'unknown'
        ? ''
        : `Please use the latest version with \`${packageManager} create @shopify/hydrogen@latest\``,
    );
  }

  // Start downloading templates early.
  let templatesDownloaded = false;
  const templatesPromise = getLatestTemplates()
    .then((result) => {
      templatesDownloaded = true;
      return result;
    })
    .catch((error) => {
      renderFatalError(error);
      process.exit(1);
    });

  const appTemplate =
    options.template ??
    (await renderSelectPrompt({
      message: 'Choose a template',
      defaultValue: 'hello-world',
      choices: STARTER_TEMPLATES.map((value) => ({
        label: value
          .replace(/-/g, ' ')
          .replace(/\b\w/g, (l) => l.toUpperCase()),
        value,
      })),
    }));

  const language =
    options.language ??
    (await renderSelectPrompt({
      message: 'Choose a language',
      choices: [
        {label: 'JavaScript', value: 'js'},
        {label: 'TypeScript', value: 'ts'},
      ],
      defaultValue: 'js',
    }));

  const location =
    options.path ??
    (await renderTextPrompt({
      message: 'Where would you like to create your app?',
      defaultValue: 'hydrogen-storefront',
    }));

  const projectName = basename(location);
  const projectDir = resolvePath(process.cwd(), location);

  if (await projectExists(projectDir)) {
    if (!options.force) {
      const deleteFiles = await renderConfirmationPrompt({
        message: `${location} is not an empty directory. Do you want to delete the existing files and continue?`,
        defaultValue: false,
      });

      if (!deleteFiles) {
        renderInfo({
          headline: `Destination path ${location} already exists and is not an empty directory. You may use \`--force\` or \`-f\` to override it.`,
        });

        return;
      }
    }

    await rmdir(projectDir, {force: true});
  }

  // Templates might be cached or the download might be finished already.
  // Only output progress if the download is still in progress.
  if (!templatesDownloaded) {
    await renderTasks([
      {
        title: 'Downloading templates',
        task: async () => {
          await templatesPromise;
        },
      },
    ]);
  }

  const {templatesDir} = await templatesPromise;

  await copyFile(joinPath(templatesDir, appTemplate), projectDir);

  if (language === 'js') {
    try {
      await transpileProject(projectDir);
    } catch (error) {
      await rmdir(projectDir, {force: true});
      throw error;
    }
  }

  let depsInstalled = false;
  let packageManager = await packageManagerUsedForCreating();

  if (packageManager !== 'unknown') {
    const installDeps =
      options.installDeps ??
      (await renderConfirmationPrompt({
        message: `Install dependencies with ${packageManager}?`,
      }));

    if (installDeps) {
      await installNodeModules({
        directory: projectDir,
        packageManager,
        args: [],
        stdout: process.stdout,
        stderr: process.stderr,
      });

      depsInstalled = true;
    }
  } else {
    // Assume npm for showing next steps
    packageManager = 'npm';
  }

  renderSuccess({
    headline: `${projectName} is ready to build.`,
    nextSteps: [
      outputContent`Run ${outputToken.genericShellCommand(`cd ${location}`)}`
        .value,
      depsInstalled
        ? undefined
        : outputContent`Run ${outputToken.genericShellCommand(
            `${packageManager} install`,
          )} to install the dependencies`.value,
      outputContent`Run ${outputToken.packagejsonScript(
        packageManager,
        'dev',
      )} to start your local development server and start building`.value,
    ].filter((step): step is string => Boolean(step)),
    reference: [
      'Getting started with Hydrogen: https://shopify.dev/docs/custom-storefronts/hydrogen/building/begin-development',
      'Hydrogen project structure: https://shopify.dev/docs/custom-storefronts/hydrogen/project-structure',
      'Setting up Hydrogen environment variables: https://shopify.dev/docs/custom-storefronts/hydrogen/environment-variables',
    ],
  });

  if (appTemplate === 'demo-store') {
    renderInfo({
      headline: `Your project will display inventory from the Hydrogen Demo Store.`,
      body: `To connect this project to your Shopify store’s inventory, update \`${projectName}/.env\` with your store ID and Storefront API key.`,
    });
  }
}

async function projectExists(projectDir: string) {
  return (
    (await fileExists(projectDir)) &&
    (await isDirectory(projectDir)) &&
    (await readdir(projectDir)).length > 0
  );
}

function supressNodeExperimentalWarnings() {
  const warningListener = process.listeners('warning')[0]!;
  if (warningListener) {
    process.removeAllListeners('warning');
    process.prependListener('warning', (warning) => {
      if (warning.name != 'ExperimentalWarning') {
        warningListener(warning);
      }
    });
  }
}
