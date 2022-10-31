#!/usr/bin/env node

export {};

const [, , ...args] = process.argv;

const options = {} as Record<string, any>;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  const nextArg = args[i + 1];
  if (arg.startsWith('--')) {
    options[
      arg.replace('--', '').replace(/-([a-z])/g, (_, m1) => m1.toUpperCase())
    ] = !nextArg || nextArg.startsWith('--') ? true : nextArg;
  }
}

const [command] = args;

if (command === 'build') {
  if (!options.entry) {
    throw new Error('The flag --entry is required');
  }

  (async () => {
    // @ts-ignore
    const {runBuild} = await import('./commands/build');

    await runBuild(options as any);

    process.exit();
  })();
} else if (
  command === 'dev' ||
  command === undefined ||
  command.startsWith('-')
) {
  if (!options.entry) {
    throw new Error('The flag --entry is required');
  }

  (async () => {
    // @ts-ignore
    const {runDev} = await import('./commands/dev');
    // @ts-ignore
    runDev(options);
  })();
} else if (command === 'preview') {
  (async () => {
    // @ts-ignore
    const {runPreview} = await import('./commands/preview');
    // @ts-ignore
    runPreview(options);
  })();
} else {
  // eslint-disable-next-line no-console
  console.log(`Command "${command}" not supported`);
}
