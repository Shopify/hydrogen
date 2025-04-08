#!/usr/bin/env node

import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {readFileSync, readdirSync, existsSync} from 'fs';
import path, {dirname, resolve} from 'path';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  const server = new McpServer(
    {
      name: 'cookbook-mcp',
      version: '0.0.1',
    },
    {
      capabilities: {
        logging: {},
      },
    },
  );

  registerTools(server);
  registerPrompts(server);
  registerResources(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`Cookbook MCP Server running on stdio`);
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});

function listRecipes(): string[] {
  return readdirSync(path.join(__dirname, '..', 'data', 'recipes'));
}

function registerTools(server: McpServer) {
  console.error('registering tools');
  server.tool(
    'get_recipe_names',
    'This tool returns a list of recipe names that showcase Hydrogen usecases.',
    {},
    () => {
      return {
        content: [
          {
            type: 'text',
            text: listRecipes().join(', '),
          },
        ],
      };
    },
  );
}

function registerPrompts(_server: McpServer) {}

function registerResources(server: McpServer) {
  console.error('registering resources');
  const recipes = listRecipes();
  console.error('the recipes:', recipes.join(', '));
  recipes.forEach((recipe) => {
    server.resource(recipe, `cookbook://recipe_${recipe}`, async (uri) => {
      const p = path.join(
        __dirname,
        '..',
        'data',
        'recipes',
        recipe,
        'recipe.md',
      );
      return {
        contents: [
          {
            uri: uri.href,
            text: readFileSync(p, 'utf8'),
          },
        ],
      };
    });
  });
}
