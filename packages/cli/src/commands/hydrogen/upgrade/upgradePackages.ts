import type {Cmd} from './types.js';
import {execa} from 'execa';
import {renderTasks} from '@shopify/cli-kit/node/ui';

/**
 * Perform the actual npm, yarn, or pnpm upgrade tasks of the selected packages
 * @param cmd - The command to run
 * @param appPath - Path to the Hydrogen app
 * @returns void
 */
export async function upgradePackages({
  cmd,
  appPath,
}: {
  cmd: Cmd;
  appPath: string;
}) {
  let tasks = [
    {
      title: 'Upgrading dependencies. This could take a few minutes',
      task: async () => {
        try {
          await execa(
            cmd.dependencies[0] as string,
            cmd.dependencies.slice(1),
            {
              cwd: appPath,
            },
          );
        } catch (error) {
          let message = '';

          if (error instanceof Error) {
            message = error.message;
          } else if (typeof error === 'string') {
            message = error;
          } else {
            message = 'Unknown error';
          }

          throw new Error(message);
        }
      },
    },
    {
      title: 'Upgrading devDependencies. This could take a few minutes',
      task: async () => {
        try {
          await execa(
            cmd.devDependencies[0] as string,
            cmd.devDependencies.slice(1),
            {
              cwd: appPath,
            },
          );
        } catch (error) {
          let message = '';

          if (error instanceof Error) {
            message = error.message;
          } else if (typeof error === 'string') {
            message = error;
          } else {
            message = 'Unknown error';
          }
          throw new Error(message);
        }
      },
    },
  ];

  await renderTasks(tasks);
}
