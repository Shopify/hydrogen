import * as remix from '@remix-run/dev/dist/cli/run';

export async function runInit(args: {typescript?: Boolean}) {
  const defaults = [
    '--template',
    '../../templates/demo-store',
    '--install',
    args.typescript ? '--typescript' : '',
  ];

  remix.run(['create', ...defaults]);
}
