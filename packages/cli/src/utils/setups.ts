import {output, path, file} from '@shopify/cli-kit';
import {renderInfo, renderSuccess} from '@shopify/cli-kit/node/ui';
import {applyTransform, type Transform} from './transform.js';
import {type Changeset} from './parse-guide.js';
import glob from 'fast-glob';

export interface UpgradeOptions {
  dry?: boolean;
  silent?: boolean;
  diff?: boolean;
}

export async function runChangesets(
  directory: string,
  changes: Changeset[],
  transforms: Transform[] | Transform,
  options: UpgradeOptions = {},
) {
  const files = await glob(path.join(directory, '/**/*.{js,ts,tsx,jsx}'), {
    ignore: ['**/node_modules/**', '**/dist/**'],
  });

  const tasks = changes.map((changeset) => {
    const {title = '', description = ''} = changeset;

    return {
      title,
      task: async () => {
        const results = await applyTransform(transforms, files);
        if (!options.silent) output.info(description);

        const changed = Array.from(results.entries())
          .filter(([_, result]) => result.state === 'changed')
          .map(([filename, result]) => ({
            ...result,
            filename,
            pathname: path.relative(directory, filename),
          }));

        for (const {pathname, filename, after, diff} of changed) {
          if (options.diff) {
            renderInfo({
              headline: pathname,
              body: output.content`${output.token.linesDiff(diff)}`.value,
            });
          }

          if (!options.dry) {
            await file.write(filename, after);
          }
        }

        if (options.dry) {
          return;
        }

        renderSuccess({
          headline: `${changed.length} files changed`,
          body: {
            list: {
              items: changed
                .filter(Boolean)
                .map(({state, pathname}) => `[${state}] ${pathname}`),
            },
          },
        });
      },
    };
  });

  return tasks;
}
