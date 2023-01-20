import {checkLockfileStatus} from './build/check-lockfile.js';
// @ts-ignore
import {build as viteBuild} from 'vite';
import {ui, error as kitError} from '@shopify/cli-kit';

type Target = 'node' | 'client' | 'worker';

interface DevOptions {
  directory: string;
  targets: {[key in Target]: boolean | string};
  base?: string;
  assetBaseURL?: string;
  verbose?: boolean;
}

export function buildTaskList({
  directory,
  targets,
  base,
  assetBaseURL,
  verbose,
}: DevOptions): ui.ListrTask[] {
  const commonConfig = {base, root: directory};

  return Object.entries(targets)
    .filter(([_, value]) => value)
    .map(([key, value]) => ({
      title: `Building ${key} code`,
      task: async (_, task) => {
        if (key === 'worker') {
          process.env.WORKER = 'true';
        }
        if (assetBaseURL) {
          process.env.HYDROGEN_ASSET_BASE_URL = assetBaseURL;
        }

        try {
          await viteBuild({
            ...commonConfig,
            build: {
              outDir: `dist/${key}`,
              ssr: typeof value === 'string' ? value : undefined,
              manifest: key === 'client',
            },
            logLevel: verbose ? 'info' : 'silent',
          });
        } catch (error: any) {
          const abortError = new kitError.Abort(error.message);
          abortError.stack = error.stack;
          throw abortError;
        }

        task.title = `Built ${key} code`;
      },
    }));
}

export async function build(options: DevOptions) {
  await checkLockfileStatus(options.directory);

  const tasks = await buildTaskList(options);

  const list = ui.newListr(tasks);

  await list.run();
}
