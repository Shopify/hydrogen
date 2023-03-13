import Command from '@shopify/cli-kit/node/base-command';
import {
  installNodeModules,
  packageManagerUsedForCreating,
} from '@shopify/cli-kit/node/node-package-manager';
import {renderFatalError} from '@shopify/cli-kit/node/ui';
import Flags from '@oclif/core/lib/flags.js';
import {output, path} from '@shopify/cli-kit';
import {
  commonFlags,
  parseProcessFlags,
  flagsToCamelObject,
} from '../../utils/flags.js';
import {transpileProject} from '../../utils/transpile-ts.js';
import {getLatestTemplates} from '../../utils/template-downloader.js';
import {checkHydrogenVersion} from '../../utils/check-version.js';
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
    // @ts-ignore
    const {flags} = await this.parse(Init);

    await runInit(flagsToCamelObject(flags));
  }
}

type Writable<T> = {-readonly [P in keyof T]: T[P]};

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
  const templatesPromise = getLatestTemplates().catch((error) => {
    output.info('\n\n\n');
    renderFatalError(error);

    process.exit(1);
  });

  const {ui, file} = await import('@shopify/cli-kit');
  const {renderSuccess, renderInfo} = await import('@shopify/cli-kit/node/ui');
  const prompts: Writable<Parameters<typeof ui.prompt>[0]> = [];

  if (!options.template) {
    prompts.push({
      type: 'select',
      name: 'template',
      message: 'Choose a template',
      choices: STARTER_TEMPLATES.map((value) => ({
        name: value.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        value,
      })),
    });
  }

  if (!options.language) {
    prompts.push({
      type: 'select',
      name: 'language',
      message: 'Choose a language',
      choices: [
        {name: 'JavaScript', value: 'js'},
        {name: 'TypeScript', value: 'ts'},
      ],
      default: 'js',
    });
  }

  if (!options.path) {
    prompts.push({
      type: 'input',
      name: 'path',
      message: 'Where would you like to create your app?',
      default: 'hydrogen-storefront',
    });
  }

  const {
    path: location = options.path!,
    template: appTemplate = options.template!,
    language = options.language ?? 'js',
  } = prompts.length > 0 ? await ui.prompt(prompts) : options;

  const projectName = path.basename(location);
  const projectDir = path.resolve(process.cwd(), location);

  if (await projectExists(projectDir)) {
    if (!options.force) {
      const {deleteFiles} = await ui.prompt([
        {
          type: 'select',
          name: 'deleteFiles',
          message: `${location} is not an empty directory. Do you want to delete the existing files and continue?`,
          choices: [
            {name: 'Yes, delete the files', value: 'true'},
            {name: 'No, do not delete the files', value: 'false'},
          ],
          default: 'false',
        },
      ]);

      if (deleteFiles === 'false') {
        renderInfo({
          headline: `Destination path ${location} already exists and is not an empty directory. You may use \`--force\` or \`-f\` to override it.`,
        });

        return;
      }
    }

    await file.rmdir(projectDir, {force: true});
  }

  // Templates might be cached or the download might be finished already.
  // Only output progress if the download is still in progress.
  let downloaded = false;
  setTimeout(
    () => !downloaded && output.info('\n📥 Downloading templates...'),
    150,
  );
  const {templatesDir} = await templatesPromise;
  downloaded = true;

  await file.copy(path.join(templatesDir, appTemplate), projectDir);

  if (language === 'js') {
    try {
      await transpileProject(projectDir);
    } catch (error) {
      await file.rmdir(projectDir, {force: true});
      throw error;
    }
  }

  let depsInstalled = false;
  let packageManager = await packageManagerUsedForCreating();

  if (packageManager !== 'unknown') {
    const installDeps =
      options.installDeps ??
      (
        await ui.prompt([
          {
            type: 'select',
            name: 'installDeps',
            message: `Install dependencies with ${packageManager}?`,
            choices: [
              {name: 'Yes', value: 'true'},
              {name: 'No', value: 'false'},
            ],
            default: 'true',
          },
        ])
      ).installDeps === 'true';

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
      `Run \`cd ${location}\`${
        depsInstalled ? '' : `, \`${packageManager} install\`,`
      } and \`${
        packageManager + (packageManager === 'npm' ? ' run' : '')
      } dev\` to start your local development server and start building.`,
    ],
    reference: [
      'Building with Hydrogen: https://shopify.dev/custom-storefronts/hydrogen',
    ],
  });

  renderInfo({
    headline: `Your project will display inventory from the Hydrogen Demo Store.`,
    body: `To connect this project to your Shopify store’s inventory, update \`${projectName}/.env\` with your store ID and Storefront API key.`,
  });
}

async function projectExists(projectDir: string) {
  const {file} = await import('@shopify/cli-kit');
  return (
    (await file.exists(projectDir)) &&
    (await file.isDirectory(projectDir)) &&
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
