import type {ServerResponse} from 'node:http';
import {readFile} from 'node:fs/promises';
import type {ViteDevServer} from 'vite';
import {getErrorPage} from '../common/error-page.js';
import type {Response} from '../worker/index.js';

export function isEntrypointError(webResponse: Response) {
  return (
    webResponse.status === 503 &&
    webResponse.statusText === 'executeEntrypoint error'
  );
}

export type CustomEntryPointErrorHandler = (params: {
  optimizableDependency?: string;
  stack: string;
}) => void | Promise<{
  status?: number;
  body?: string;
  headers?: Record<string, string>;
} | void>;

export async function handleEntrypointError(
  viteDevServer: ViteDevServer,
  webResponse: Response,
  res: ServerResponse,
  entryPointErrorHandler?: CustomEntryPointErrorHandler,
) {
  const stack = (await webResponse.text())
    .split('\n')
    .filter((line) => !line.includes('mini-oxygen'))
    .join('\n');

  const optimizableDependency = await findOptimizableDependency(
    viteDevServer,
    stack,
  );

  console.debug(
    'Optimizable dependency:',
    optimizableDependency,
    '\n\n',
    stack,
  );

  const header = `MiniOxygen could not load the app's entry point.`;
  const message = optimizableDependency
    ? `Try adding <code>${optimizableDependency}</code> to the <code>ssr.optimizeDeps.include</code> array in your Vite config.`
    : '';

  if (!entryPointErrorHandler) {
    console.warn(
      '\nWarning: ' + header + '\n' + message.replace(/<\/?code>/g, '"'),
    );
  }

  const result = await entryPointErrorHandler?.({optimizableDependency, stack});

  res.writeHead(
    result?.status ?? 503,
    result?.headers ?? {'Content-Type': 'text/html; charset=utf-8'},
  );

  res.end(
    result?.body ??
      getErrorPage({
        title: 'Entry point error',
        header: `MiniOxygen could not load the app's entry point.`,
        message,
        code: stack,
      }),
  );

  return true;
}

async function findOptimizableDependency(
  viteServer: ViteDevServer,
  stack: string,
) {
  const filepath = stack
    .match(/^\s+at\s([^:\?]+)(\?|:\d)/m)?.[1]
    ?.replace(/^.*?\(/, '')
    .replace(/\?.+$/, '');

  const nodeModulesPath = filepath?.split(/node_modules[\\\/]/).pop();

  if (!filepath || !nodeModulesPath) return;

  const mods = viteServer.moduleGraph.getModulesByFile(filepath);
  const modImporters = new Set<string>();

  mods?.forEach((mod) => {
    mod.importers.forEach((importer) => {
      if (importer.file) modImporters.add(importer.file);
    });
  });

  for (const mod of modImporters) {
    const importersSet = new Set<string>();

    const code = await readFile(mod, 'utf-8').catch(() => '');
    const matches =
      code.matchAll(/import\s[^'"]+\sfrom\s+['"]((@|\w)[^'"]+)['"]/g) ?? [];

    for (const [, match] of matches) {
      if (match) importersSet.add(match);
    }

    const importers = Array.from(importersSet).sort(
      (a, b) => b.length - a.length,
    );

    const foundMatchingDependency = importers.find((importer) =>
      nodeModulesPath.startsWith(importer),
    );

    if (foundMatchingDependency) return foundMatchingDependency;
  }
}
