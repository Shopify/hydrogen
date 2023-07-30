import Command from '@shopify/cli-kit/node/base-command';
import fs from 'fs/promises';
import {joinPath, resolvePath} from '@shopify/cli-kit/node/path';
import {capitalize} from '@shopify/cli-kit/common/string';
import {renderSuccess, renderSelectPrompt} from '@shopify/cli-kit/node/ui';
import {commonFlags} from '../../../lib/flags.js';
import {Args} from '@oclif/core';
import type {Component} from './component.js';

export type BaseFile = {
  name: string;
  source: string;
  description: string;
};

type SectionComponent = BaseFile & {
  schema: string;
  type: 'section';
  components?: Array<Component>;
};

type SectionItem = {
  name: string;
  handle: string;
  description: string;
};

type AvailableSections = Array<SectionItem>;

export default class GenerateSection extends Command {
  static description = 'Generates a commerce component.';
  static flags = {
    adapter: commonFlags.adapter,
    typescript: commonFlags.typescript,
    force: commonFlags.force,
    path: commonFlags.path,
  };

  static hidden: true;

  static args = {
    sectionName: Args.string({
      name: 'sectionName',
      description: `The section to generate}.`,
      required: false,
      env: 'SHOPIFY_HYDROGEN_ARG_SECTION',
    }),
  };

  async run(): Promise<void> {
    let {
      flags,
      args: {sectionName},
    } = await this.parse(GenerateSection);

    let directory = flags.path ? resolvePath(flags.path) : process.cwd();

    if (await isHydrogenRoot(directory)) {
      directory = joinPath(directory, 'app');
    } else {
      throw new Error(
        'h2 generate section must be run from the root of Hydrogen project containing an `app` folder',
      );
    }

    // If no section name is provided, prompt the user to select one
    if (!sectionName) {
      const availableSections = await fetchAvailableSections();

      sectionName = await renderSelectPrompt({
        message: 'Select a section to generate:',
        choices: availableSections.map(({name, description}) => ({
          value: name,
          label: `${name} - ${description}\n${getRegistryUrl({
            name,
            type: 'sections',
            preview: true,
          })}\n`,
        })),
        defaultValue: 'Hero',
      });
    }

    await runGenerateComponent({
      ...flags,
      directory,
      sectionName: capitalize(sectionName.toLowerCase()),
    });
  }
}

interface GenerateComponentOptions {
  sectionName: string;
  directory: string;
  adapter?: string;
  typescript?: boolean;
  force?: boolean;
}

export async function runGenerateComponent({
  sectionName,
  directory,
  typescript,
}: GenerateComponentOptions) {
  const section = await downloadSection(sectionName);
  await writeSectionFiles({section, directory});
}

/**
 * Checks if the current directory is the root of a Hydrogen project
 */
export async function isHydrogenRoot(directory: string): Promise<boolean> {
  const remixEnvDts = joinPath(directory, 'remix.env.d.ts');
  try {
    await fs.access(remixEnvDts, fs.constants.F_OK);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Writes the files for a section the react component and its schema
 * @param section - The section to write files for
 * @param directory - The directory to write the files to
 * @example
 * ```ts
 * const section = await fetchSection('ImageText');
 * await writeSectionFiles({section, directory: '/Users/username/project'});
 * -> creates /Users/username/project/sections/ImageText.tsx and /Users/username/project/sections/ImageText.schema.ts
 * ```
 */
async function writeSectionFiles({
  section,
  directory,
}: {
  section: SectionComponent;
  directory: GenerateComponentOptions['directory'];
}) {
  const sectionsFolder = joinPath(directory, 'sections');
  const componentsFolder = joinPath(directory, 'components');
  console.log('directory', directory);
  console.log('sectionsFolder', sectionsFolder);

  // Create sections folder if it doesn't exist
  try {
    await fs.access(sectionsFolder, fs.constants.F_OK);
  } catch (error) {
    await fs.mkdir(sectionsFolder);
  }

  // write the section react component
  if (section.source) {
    await fs.writeFile(`${sectionsFolder}/${section.name}.tsx`, section.source);
    renderSuccess({
      headline: `Created section ${section.name} in ${sectionsFolder}`,
      body: {
        list: {
          items: [section.source],
        },
      },
    });
  }

  // write the section schema
  if (section.schema) {
    await fs.writeFile(
      `${sectionsFolder}/${section.name}.schema.ts`,
      section.schema,
    );
    renderSuccess({
      headline: `Created section schema ${section.name}.schema.ts in ${sectionsFolder}`,
      body: {
        list: {
          items: [section.schema],
        },
      },
    });
  }

  // (optional) write component dependencies if any
  if (section.components) {
    await Promise.all(
      section.components.map(async (component) => {
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
      }),
    );
  }
}

/**
 * Generates a endpoint url to retrieve a component or a section from the registry
 * @param type - The type of asset to retrieve
 * @param name - The name of the asset to retrieve
 * @returns The url to retrieve the asset from
 * @example
 * ```ts
 * const sectionsUrls = getRegistryUrl({type: 'sections', name: 'Hero'});
 * -> returns 'https://hydrogen-ui-e3f48eed66654f1e6bd3.o2.myshopify.dev/sections/Hero.json'
 * ```
 */
export function getRegistryUrl({
  type,
  name,
  preview,
}: {
  type: 'sections' | 'components';
  name: string;
  /** wether to return the component or section preview url rather than the json */
  preview?: boolean;
}) {
  if (!process.env.HYDROGEN_UI_URL) {
    throw new Error('HYDROGEN_REGISTRY_URL not found');
  }

  if (!name) {
    return `${process.env.HYDROGEN_UI_URL}/${type}.json`;
  }

  if (preview) {
    return `${process.env.HYDROGEN_UI_URL}/${type}/${name}`;
  }

  return `${process.env.HYDROGEN_UI_URL}/${type}/${name}.json`;
}

/**
 * Fetches a section from the registry
 * @param name - The name of the section to retrieve
 * @returns The section
 * @example
 * ```ts
 * const section = await fetchSection('ImageText');
 * -> {name: 'ImageText', type: 'section', source: '...', schema: '...', description: '...', components: [..]}
 * ```
 */
async function downloadSection(
  name: string,
): Promise<SectionComponent | never> {
  const sectionsUrl = getRegistryUrl({type: 'sections', name});
  const response = await fetch(sectionsUrl);

  renderSuccess({
    headline: `Downloading section ${name} from ${sectionsUrl}`,
  });

  if (!response.ok) {
    throw new Error('Failed to fetch section');
  }

  const data = await response.json();

  if (typeof data !== 'object' || !data) {
    throw new Error('Invalid section');
  }

  return data as SectionComponent;
}

/**
 * Fetches all available sections from the registry /sections.json endpoint
 * @returns The available sections
 * @example
 * ```ts
 * const availableSections = await fetchAvailableSections();
 * -> returns [{name: 'ImageText',  description: '...', handle: 'image-text'}, ...]
 *  ```
 **/
async function fetchAvailableSections(): Promise<AvailableSections> {
  const sectionsUrl = getRegistryUrl({type: 'sections', name: ''});
  const response = await fetch(sectionsUrl);
  const data = await response.json();

  if (!data || !Array.isArray(data)) {
    throw new Error(`No sections found at ${sectionsUrl}`);
  }

  return data as AvailableSections;
}
