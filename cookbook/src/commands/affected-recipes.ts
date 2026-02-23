import { CommandModule } from 'yargs';
import { getAffectedRecipes } from '../lib/dependency-graph';

type AffectedRecipesArgs = {
  files: string[];
  json: boolean;
};

export const affectedRecipes: CommandModule<{}, AffectedRecipesArgs> = {
  command: 'affected-recipes [files..]',
  describe: 'List recipes affected by changes to the given skeleton files',
  builder: {
    files: {
      type: 'array',
      description: 'Repo-relative paths to changed skeleton files',
      default: [],
    },
    json: {
      type: 'boolean',
      description: 'Output as JSON array instead of newline-separated names',
      default: false,
    },
  },
  handler({ files, json }) {
    const affected = getAffectedRecipes(files as string[]);

    if (json) {
      console.log(JSON.stringify(affected));
    } else {
      for (const name of affected) {
        console.log(name);
      }
    }
  },
};
