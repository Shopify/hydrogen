import Command from '@shopify/cli-kit/node/base-command';
import Flags from '@oclif/core/lib/flags.js';
import path from 'path';

// This must be imported to fix some issue with Flags
import '@oclif/core/lib/parser/parse.js';

// @ts-ignore
export default class Init extends Command {
  static description = 'Creates a new Hydrogen storefront project';
  static flags = {
    typescript: Flags.boolean({
      description: 'Use TypeScript',
      env: 'SHOPIFY_HYDROGEN_FLAG_TYPESCRIPT',
    }),
    path: Flags.string({
      description: 'The path to create the project in',
      env: 'SHOPIFY_HYDROGEN_FLAG_PATH',
    }),
    template: Flags.string({
      description: 'The template to use',
      env: 'SHOPIFY_HYDROGEN_FLAG_TEMPLATE',
    }),
    token: Flags.string({
      description:
        'A GitHub token used to access access private repository templates',
      env: 'SHOPIFY_HYDROGEN_FLAG_TOKEN',
    }),
  };

  async run(): Promise<void> {
    // @ts-ignore
    const {flags} = await this.parse(Init);

    await runInit({...flags});
  }
}

type Writable<T> = {-readonly [P in keyof T]: T[P]};

export async function runInit(
  options: {
    path?: string;
    template?: string;
    typescript?: Boolean;
    token?: string;
  } = {},
) {
  const {createApp, validateNewProjectPath} = await import(
    '@remix-run/dev/dist/cli/create.js'
  );
  const {convertToJavaScript} = await import(
    '@remix-run/dev/dist/cli/migrate/migrations/convert-to-javascript/index.js'
  );

  const {ui} = await import('@shopify/cli-kit');
  const prompts: Writable<Parameters<typeof ui.prompt>[0]> = [];

  if (!options.path) {
    prompts.push({
      type: 'input',
      name: 'path',
      message: '👋 Where would you like to create your Hydrogen project?',
      default: './hydrogen-store',
    });
  }

  if (!options.template) {
    prompts.push({
      type: 'select',
      name: 'template',
      message: 'Please select a Hydrogen template',
      choices: ['demo-store', 'hello-world'].map((t) => ({
        name: t,
        value: new URL(`../../templates/${t}`, import.meta.url).pathname,
      })),
    });
  }

  if (options.typescript === undefined) {
    prompts.push({
      type: 'select',
      name: 'typescript',
      message: '⚛️ Would you like to use TypeScript?',
      choices: [
        {name: 'No', value: 'false'},
        {name: 'Yes', value: 'true'},
      ],
      default: 'false',
    });
  }

  const {
    path: location = options.path!,
    template: appTemplate = options.template!,
    typescript = options.typescript!,
  } = prompts.length > 0 ? await ui.prompt(prompts) : options;

  const projectDir = path.resolve(process.cwd(), location);

  await validateNewProjectPath(projectDir);

  await createApp({
    projectDir,
    appTemplate,
    useTypeScript: true, // Transpile to JS later to avoid default logging
    installDeps: false,
    githubToken: options.token || undefined,
    debug: !!process.env.DEBUG,
  });

  if (!(typescript === true || typescript === 'true')) {
    // Supress logs in jscodeshift:
    const defaultWrite = process.stdout.write;
    // @ts-ignore
    process.stdout.write = () => {};

    await convertToJavaScript(projectDir, {interactive: false});

    // @ts-ignore
    process.stdout.write = defaultWrite;
  }

  console.log();
  console.log(`Finished creating your Hydrogen storefront in ${location}`);
  console.log(`📚 Docs: https://shopify.dev/custom-storefronts/hydrogen`);
  console.log(
    `👋 Note: your project will display inventory from the Hydrogen Demo Store.`,
  );
  console.log();
}
