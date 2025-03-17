import {CommandModule} from 'yargs';
import {generateLLMsFiles} from '../lib/llms';
type LLMSArgs = {
  recipe?: string;
};

export const llms: CommandModule<{}, LLMSArgs> = {
  command: 'llms',
  describe: 'Generate LLM files',
  builder: {
    recipe: {
      type: 'string',
      description:
        'The name of the recipe to generate LLM files for. If omitted, all recipes will be processed.',
    },
  },
  handler,
};

async function handler(args: LLMSArgs) {
  generateLLMsFiles(args.recipe);
}
