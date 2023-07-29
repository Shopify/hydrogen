import Command from '@shopify/cli-kit/node/base-command';
import fs from 'fs/promises';
import {joinPath, resolvePath} from '@shopify/cli-kit/node/path';
import {renderSelectPrompt} from '@shopify/cli-kit/node/ui';
import {capitalize} from '@shopify/cli-kit/common/string';
import {renderSuccess} from '@shopify/cli-kit/node/ui';
import {commonFlags} from '../../../lib/flags.js';
import {Args} from '@oclif/core';
import {isHydrogenRoot, getRegistryUrl} from './section.js';
import type {BaseFile} from './section.js';

type ComponentItem = {
  name: string;
  handle: string;
  description: string;
};

export type Component = BaseFile & {
  type: 'component';
};

type AvailableComponents = Array<ComponentItem>;

export default class GenerateComponent extends Command {
  static description = 'Generates a commerce component.';
  static flags = {
    adapter: commonFlags.adapter,
    typescript: commonFlags.typescript,
    force: commonFlags.force,
    path: commonFlags.path,
  };

  static hidden: true;

  static args = {
    componentName: Args.string({
      name: 'componentName',
      description: `The component to generate.`,
      required: false,
      env: 'SHOPIFY_HYDROGEN_ARG_COMPONENT',
    }),
  };

  async run(): Promise<void> {
    let {
      flags,
      args: {componentName},
    } = await this.parse(GenerateComponent);

    let directory = flags.path ? resolvePath(flags.path) : process.cwd();

    if (await isHydrogenRoot(directory)) {
      directory = joinPath(directory, 'app');
    } else {
      throw new Error(
        'h2 generate component must be run from the root of Hydrogen project containing an `app` folder',
      );
    }

    // If no component name is provided, prompt the user to select one
    if (!componentName) {
      const availableComponents = await fetchAvailableComponents();

      componentName = await renderSelectPrompt({
        message: 'Select a component to generate:',
        choices: availableComponents.map(({name}) => ({
          value: name,
          label: `${name} - \n${getRegistryUrl({
            name,
            type: 'components',
            preview: true,
          })}\n`,
        })),
        defaultValue: 'Hero',
      });
    }

    await runGenerateComponent({
      ...flags,
      directory,
      componentName: capitalize(componentName.toLowerCase()),
    });
  }
}

interface GenerateComponentOptions {
  componentName: string;
  directory: string;
  adapter?: string;
  typescript?: boolean;
  force?: boolean;
}

export async function runGenerateComponent({
  componentName,
  directory,
  typescript,
  ...options
}: GenerateComponentOptions) {
  const component = await downloadComponent(componentName);
  await writeComponentFile({component, directory});
}

/**
 * Writes the files for a component the react component and its schema
 * @param component - The component to write files for
 * @param directory - The directory to write the files to
 * @example
 * ```ts
 * const component = await fetchComponent('Aside');
 * await writeComponentFile({component, directory: '/Users/username/project'});
 * -> creates /Users/username/project/components/Aside.tsx
 * ```
 */
async function writeComponentFile({
  component,
  directory,
}: {
  component: Component;
  directory: GenerateComponentOptions['directory'];
}) {
  const componentsFolder = joinPath(directory, 'components');

  // Create component folder if it doesn't exist
  try {
    await fs.access(componentsFolder, fs.constants.F_OK);
  } catch (error) {
    await fs.mkdir(componentsFolder, {recursive: true});
  }

  // write the component react component
  if (component.source) {
    await fs.writeFile(
      `${componentsFolder}/${component.name}.tsx`,
      component.source,
    );
    renderSuccess({
      headline: `Created component ${component.name} in ${componentsFolder}`,
      body: {
        list: {
          items: [component.source],
        },
      },
    });
  }
}

/**
 * Fetches a component from the registry
 * @param name - The name of the component to retrieve
 * @returns The component
 * @example
 * ```ts
 * const component = await fetchComponent('ProductCard');
 * -> returns {name: 'ProductCard', type: 'component', source: '...', description: '...'}
 * ```
 */
async function downloadComponent(name: string): Promise<Component | never> {
  const componentsUrl = getRegistryUrl({type: 'components', name});
  const response = await fetch(componentsUrl);

  if (!response.ok) {
    throw new Error('Failed to fetch component');
  }

  const data = await response.json();

  if (typeof data !== 'object' || !data) {
    throw new Error('Invalid component');
  }

  return data as Component;
}

/**
 * Fetches all available components from the registry /components.json endpoint
 * @returns The available components
 * @example
 * ```ts
 * const availableComponents = await fetchAvailableComponents();
 * -> returns [{name: 'ImageText',  description: '...', handle: 'image-text'}, ...]
 *  ```
 **/
async function fetchAvailableComponents(): Promise<AvailableComponents> {
  const componentsUrl = getRegistryUrl({type: 'components', name: ''});
  const response = await fetch(componentsUrl);
  const data = await response.json();

  if (!data || !Array.isArray(data)) {
    throw new Error(`No components found at ${componentsUrl}`);
  }

  return data as AvailableComponents;
}
