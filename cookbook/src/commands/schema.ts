import {CommandModule} from 'yargs';
import {zodToJsonSchema} from 'zod-to-json-schema';
import fs from 'fs';
import {COOKBOOK_PATH} from '../lib/constants';
import path from 'path';
import {RecipeSchema} from '../lib/recipe';

type SchemaArgs = {};

export const schema: CommandModule<{}, SchemaArgs> = {
  command: 'schema',
  describe: 'Render the recipe JSON schema out of the Recipe type.',
  builder: {},
  handler,
};

async function handler(_: SchemaArgs) {
  const jsonSchema = zodToJsonSchema(RecipeSchema);
  console.log(JSON.stringify(jsonSchema, null, 2));

  fs.writeFileSync(
    path.join(COOKBOOK_PATH, 'recipe.schema.json'),
    JSON.stringify(jsonSchema, null, 2),
  );
}
