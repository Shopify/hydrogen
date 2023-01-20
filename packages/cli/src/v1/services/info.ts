import type {HydrogenConfig} from '../utilities/load-config.js';
import {HydrogenApp} from '../models/hydrogen.js';
import {output} from '@shopify/cli-kit';
import {os} from '@shopify/cli-kit';
import {string} from '@shopify/cli-kit';

const {capitalize, linesToColumns} = string;

interface InfoOptions {
  showPrivateData: boolean;
}

export function info(
  app: HydrogenApp,
  {showPrivateData}: InfoOptions,
): output.Message {
  const appInfo = new HydrogenAppInfo(app);

  return appInfo.output({showPrivateData});
}

const NOT_FOUND_TEXT = output.content`${output.token.italic('Not found')}`
  .value;
const NOT_CONFIGURED_TEXT = output.content`${output.token.italic(
  'Not yet configured',
)}`.value;

class AppInfo {
  private app: HydrogenApp;
  constructor(app: HydrogenApp) {
    this.app = app;
  }

  output({showPrivateData}: InfoOptions): string {
    const sections: [string, string][] = [
      this.projectSettingsSection(),
      this.storefrontSettingsSection({showPrivateData}),
      this.eslintSection(),
      this.systemInfoSection(),
    ];
    return sections
      .map((sectionContents: [string, string]) =>
        this.section(...sectionContents),
      )
      .join('\n\n');
  }

  projectSettingsSection(): [string, string] {
    const title = 'Your Project';

    const lines = [
      ['Name', this.app.name],
      ['Project location', this.app.directory],
      ['Language', this.app.language],
    ];

    const projectInfo = linesToColumns(lines);
    return [title, projectInfo];
  }

  storefrontSettingsSection({showPrivateData}: InfoOptions): [string, string] {
    const errors: string[] = [];
    const title = 'Storefront';

    if (
      this.app.configuration.shopify &&
      typeof this.app.configuration.shopify === 'function'
    ) {
      return [
        title,
        'Storefront settings defined as a function are not supported in this command.',
      ];
    }

    const privateFields = showPrivateData ? ['storefrontToken'] : [];

    const fields = [
      'storeDomain',
      'storefrontApiVersion',
      ...privateFields,
    ] as unknown as keyof HydrogenConfig['shopify'][];

    const storefrontInfo = this.configurationCheck(
      fields,
      this.app.configuration.shopify,
    );

    let errorContent = `\n${errors.map(this.formattedError).join('\n')}`;

    if (errorContent.trim() === '') errorContent = '';

    return [title, `${linesToColumns(storefrontInfo)}${errorContent}`];
  }

  eslintSection(): [string, string] {
    const errors: string[] = [];
    const title = 'ESLint';
    const dependencyResults = this.dependencyCheck([
      'eslint',
      'eslint-plugin-hydrogen',
    ]);

    if (
      this.app.nodeDependencies.eslint &&
      !this.app.nodeDependencies['eslint-plugin-hydrogen']
    ) {
      errors.push(
        'Run `yarn shopify add eslint` to install and configure eslint for hydrogen',
      );
    }

    let errorContent = `\n${errors.map(this.formattedError).join('\n')}`;

    if (errorContent.trim() === '') errorContent = '';

    return [title, `${linesToColumns(dependencyResults)}${errorContent}`];
  }

  configurationCheck(
    key: keyof HydrogenConfig | keyof HydrogenConfig[],
    configObject: HydrogenConfig | HydrogenConfig['shopify'] = this.app
      .configuration,
  ): string[][] {
    const keys = Array.isArray(key) ? key : [key];

    // @ts-ignore
    const result = keys.reduce((acc, key) => {
      const found =
        configObject[
          key as keyof HydrogenConfig & keyof HydrogenConfig['shopify']
        ];

      if (typeof found === 'string') {
        const result = [capitalize(key.toString()), found];
        return [...acc, result];
      }

      const result = [key, NOT_CONFIGURED_TEXT];
      return [...acc, result];
    }, []);

    return result;
  }

  dependencyCheck(dependency: string | string[]): string[][] {
    const dependencies = Array.isArray(dependency) ? dependency : [dependency];

    const result = dependencies.reduce<string[][]>((acc, dependency) => {
      const found = this.app.nodeDependencies[dependency];
      if (found) {
        const result = [dependency, found];
        return [...acc, result];
      }

      const result = [dependency, NOT_FOUND_TEXT];
      return [...acc, result];
    }, []);

    return result;
  }

  formattedError(str: string): string {
    const [errorFirstLine, ...errorRemainingLines] = str.split('\n');
    const errorLines = [
      `! ${errorFirstLine}`,
      ...errorRemainingLines.map((line) => `  ${line}`),
    ];
    return output.content`${output.token.errorText(errorLines.join('\n'))}`
      .value;
  }

  systemInfoSection(): [string, string] {
    const title = 'Tooling and System';
    const {platform, arch} = os.platformAndArch();
    const lines: string[][] = [
      ...this.dependencyCheck([
        '@shopify/hydrogen',
        '@shopify/cli-hydrogen',
        '@shopify/cli',
      ]),
      ['Package manager', this.app.packageManager],
      ['OS', `${platform}-${arch}`],
      ['Shell', process.env.SHELL || 'unknown'],
      ['Node.js version', process.version],
    ];

    return [title, linesToColumns(lines)];
  }

  section(title: string, body: string): string {
    const formattedTitle = `${title.toUpperCase()}${' '.repeat(
      35 - title.length,
    )}`;
    return output.content`${output.token.heading(formattedTitle)}\n${body}`
      .value;
  }
}

class HydrogenAppInfo extends AppInfo {}
