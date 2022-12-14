#!/usr/bin/env node

import {runInit} from './dist/commands/hydrogen/init.js';
import fs from 'fs/promises';

/**
 * This is a temporary executable script which is used to create new H2 apps.
 * Eventually, this will be replaced by the proper `init` command in this CLI tool,
 * which is actually an oclif plugin to the standard Shopify CLI.
 */

const [template] = process.argv.slice(2);

// List all available templates in the dir:
const templates = await fs.readdir(
  new URL('./dist/templates', import.meta.url).pathname,
);
console.log(
  `\nAvailable templates: \n- ${templates
    .map((t) => new URL(`./dist/templates/${t}`, import.meta.url).pathname)
    .join('\n- ')}\n`,
);

const defaultTemplate = new URL('./dist/templates/demo-store', import.meta.url)
  .pathname;

const resolvedTemplate = template ? template : defaultTemplate;

console.log(
  `\n✨ Using template: ${resolvedTemplate} ${template ? '' : ' (default)'}`,
);

runInit({
  template: resolvedTemplate,
});
