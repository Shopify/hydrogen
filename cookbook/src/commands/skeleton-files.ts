import {CommandModule} from 'yargs';
import {getSkeletonFileMap} from '../lib/dependency-graph';

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
      description: 'Output as JSON object instead of formatted text',
      default: false,
    },
  },
  handler({recipe, json}) {
    const fileMap = getSkeletonFileMap(recipe.length > 0 ? recipe : undefined);

    if (json) {
      const obj = Object.fromEntries(fileMap);
      console.log(JSON.stringify(obj, null, 2));
    } else {
      fileMap.forEach((recipes, file) => {
        console.log(`${file} -> [${recipes.join(', ')}]`);
      });
    }
  },
};
