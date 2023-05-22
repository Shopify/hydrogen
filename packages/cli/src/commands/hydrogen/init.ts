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
import {outputContent, outputToken} from '@shopify/cli-kit/node/output';
import {AbortError} from '@shopify/cli-kit/node/error';
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
import {getStarterDir} from '../../lib/build.js';

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
        'Sets the template to use. Pass `demo-store` for a fully-featured store template.',
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

  const templateSetup = options.template
    ? setupRemoteTemplate(options.template)
    : setupStarterTemplate();

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

  await templateSetup.run(projectDir);

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

  templateSetup.onEnd(projectDir);
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

type TemplateSetupHandler = {
  run(projectDir: string): Promise<void>;
  onEnd(projectDir: string): void;
};

function setupRemoteTemplate(template: string): TemplateSetupHandler {
  const isDemoStoreTemplate = template === 'demo-store';

  if (!isDemoStoreTemplate) {
    // TODO: support GitHub repos as templates
    throw new AbortError(
      'Only `demo-store` is supported in --template flag for now.',
      'Skip the --template flag to run the setup flow.',
    );
  }

  // Start downloading templates early.
  let demoStoreTemplateDownloaded = false;
  const demoStoreTemplatePromise = getLatestTemplates()
    .then((result) => {
      demoStoreTemplateDownloaded = true;
      return result;
    })
    .catch((error) => {
      renderFatalError(error);
      process.exit(1);
    });

  return {
    async run(projectDir: string) {
      // Templates might be cached or the download might be finished already.
      // Only output progress if the download is still in progress.
      if (!demoStoreTemplateDownloaded) {
        await renderTasks([
          {
            title: 'Downloading templates',
            task: async () => {
              await demoStoreTemplatePromise;
            },
          },
        ]);
      }

      const {templatesDir} = await demoStoreTemplatePromise;

      await copyFile(joinPath(templatesDir, template), projectDir);
    },
    onEnd(projectName: string) {
      if (isDemoStoreTemplate) {
        renderInfo({
          headline: `Your project will display inventory from the Hydrogen Demo Store.`,
          body: `To connect this project to your Shopify store’s inventory, update \`${projectName}/.env\` with your store ID and Storefront API key.`,
        });
      }
    },
  };
}

function setupStarterTemplate(): TemplateSetupHandler {
  const starterDir = getStarterDir();

  return {
    async run(projectDir: string) {
      await copyFile(starterDir, projectDir);
    },
    onEnd() {},
  };
}
