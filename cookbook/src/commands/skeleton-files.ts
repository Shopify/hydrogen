import fs from 'fs';
import path from 'path';
import {CommandModule} from 'yargs';
import {REPO_ROOT} from '../lib/constants';
import {getSkeletonFileMap} from '../lib/dependency-graph';

type SkeletonFilesArgs = {
  recipe: string[];
  json: boolean;
  existingOnly: boolean;
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
    'existing-only': {
      type: 'boolean',
      description: 'Only show files that currently exist in the skeleton',
      default: false,
    },
  },
  handler({recipe, json, existingOnly}) {
    let fileMap = getSkeletonFileMap(recipe.length > 0 ? recipe : undefined);

    if (existingOnly) {
      fileMap = new Map(
        Array.from(fileMap.entries()).filter(([file]) =>
          fs.existsSync(path.join(REPO_ROOT, file)),
        ),
      );
    }

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
