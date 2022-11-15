import * as remix from '@remix-run/dev/dist/cli/run';

export async function runInit() {
  const args = [
    '--template',
    '../../templates/demo-store',
    '--typescript',
    '--install',
  ];

  remix.run(['create', ...args]);
}
