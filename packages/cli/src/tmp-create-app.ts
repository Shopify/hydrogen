#!/usr/bin/env node

import {runInit} from './commands/hydrogen/init.js';
import fs from 'fs/promises';
import {ui} from '@shopify/cli-kit';

/**
 * This is a temporary executable script which is used to create new H2 apps.
 * Eventually, this will be replaced by the proper `init` command in this CLI tool,
 * which is actually an oclif plugin to the standard Shopify CLI.
 */

const templates = await fs.readdir(
  new URL('./templates', import.meta.url).pathname,
);

const answers = await ui.prompt([
  {
    type: 'select',
    name: 'template',
    message: '👋 Please select a Hydrogen template',
    choices: templates.map((t) => ({
      name: t,
      value: new URL(`./templates/${t}`, import.meta.url).pathname,
    })),
  },
  {
    type: 'select',
    name: 'typescript',
    message: '⚛️ Would you like to use TypeScript?',
    choices: [
      {name: 'No', value: 'false'},
      {name: 'Yes', value: 'true'},
    ],
    default: 'false',
  },
]);

runInit({
  template: answers.template,
  typescript: answers.typescript === 'true',
});
