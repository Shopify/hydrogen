import {CommandModule} from 'yargs';
import {getSkeletonFiles} from '../lib/dependency-graph';

type SkeletonFilesArgs = {
  recipe: string[];
  json: boolean;
};

export const skeletonFiles: CommandModule<{}, SkeletonFilesArgs> = {
  command: 'skeleton-files',
  describe:
    'List all skeleton files referenced by recipes (or a specific recipe)',
  builder: {
    recipe: {
      type: 'array',
      string: true,
      description: 'Recipe name(s) to query (default: all recipes)',
      default: [],
    },
    json: {
      type: 'boolean',
      description: 'Output as JSON array instead of newline-separated paths',
      default: false,
    },
  },
  handler({recipe, json}) {
    const files = getSkeletonFiles(recipe.length > 0 ? recipe : undefined);

    if (json) {
      console.log(JSON.stringify(files));
    } else {
      for (const file of files) {
        console.log(file);
      }
    }
  },
};
