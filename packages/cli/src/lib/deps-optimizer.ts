import {AbortError, BugError} from '@shopify/cli-kit/node/error';
import {extname} from '@shopify/cli-kit/node/path';
import {renderFatalError} from '@shopify/cli-kit/node/ui';
import colors from '@shopify/cli-kit/node/colors';
import {type FormatOptions} from './format-code.js';
import {importLangAstGrep} from './ast.js';
import {replaceFileContent} from './file.js';
import {outputInfo} from '@shopify/cli-kit/node/output';

let showBannerUrlTimeout: NodeJS.Timeout | undefined;

export function createEntryPointErrorHandler({
  disableDepsOptimizer,
  showSuccessBanner,
  configFile,
  formatOptionsPromise,
}: {
  showSuccessBanner: () => void;
  disableDepsOptimizer?: boolean;
  configFile?: string;
  formatOptionsPromise: Promise<FormatOptions>;
}) {
  return async function entryPointErrorHandler({
    optimizableDependency,
    stack,
  }: {
    optimizableDependency?: string;
    stack: string;
  }) {
    const message = stack.split('\n')[0] ?? stack;
    const cleanStack = stack
      .split('\n')
      .filter((line) => !line.includes('virtual:remix'))
      .join('\n');

    const headline = 'MiniOxygen errored while running your entrypoint';

    if (optimizableDependency) {
      if (disableDepsOptimizer || !configFile) {
        const depError = new BugError(
          `${headline}: ${colors.dim(message.replace('ReferenceError: ', ''))}`,
          `Try adding '${colors.yellow(
            optimizableDependency,
          )}' to your Vite config\'s ssr.optimizeDeps.include`,
        );
        depError.stack = cleanStack;
        renderFatalError(depError);
      } else {
        addToViteOptimizeDeps(
          optimizableDependency,
          configFile,
          await formatOptionsPromise,
        )
          .then(() => {
            setTimeout(() => {
              outputInfo(
                `\nAdded '${colors.yellow(
                  optimizableDependency,
                )}' to your Vite config's ssr.optimizeDeps.include\n`,
              );
            }, 200);

            clearTimeout(showBannerUrlTimeout);
            showBannerUrlTimeout = setTimeout(showSuccessBanner, 2000);
          })
          .catch((error) => {
            renderFatalError(error);
          });
      }
    } else {
      const unknownError = new BugError(headline + ': ' + colors.dim(message));
      unknownError.stack = cleanStack;
      renderFatalError(unknownError);
    }
  };
}

// AST-Grep rule for finding`ssr.optimizeDeps.include: []` in Vite config
const ssrOptimizeDepsIncludeRule = {
  rule: {
    pattern: '[$$$]',
    inside: {
      kind: 'pair',
      stopBy: 'end',
      has: {
        field: 'key',
        regex: 'include',
        stopBy: 'end',
      },
      inside: {
        kind: 'pair',
        stopBy: 'end',
        has: {
          field: 'key',
          regex: 'optimizeDeps',
          stopBy: 'end',
        },
        inside: {
          kind: 'pair',
          stopBy: 'end',
          has: {
            field: 'key',
            regex: 'ssr',
            stopBy: 'end',
          },
        },
      },
    },
  },
};

export async function addToViteOptimizeDeps(
  dependency: string,
  configFile: string,
  formatOptions: FormatOptions,
) {
  const ext = extname(configFile).replace(/^\.m?/, '') as 'ts' | 'js';
  const astGrep = await importLangAstGrep(ext);

  await replaceFileContent(configFile, formatOptions, (content) => {
    const root = astGrep.parse(content).root();
    const node = root.find(ssrOptimizeDepsIncludeRule);

    if (!node) {
      throw new AbortError(
        `The dependcy "${dependency}" needs to be optimized but couldn't be added to the Vite config.`,
        `Add the following code manually to your Vite config:\n\nssr: {optimizeDeps: {include: ['${dependency}']}}`,
      );
    }

    const isAlreadyAdded = !!node.find({
      rule: {
        kind: 'string_fragment',
        regex: `^${dependency}$`,
      },
    });

    if (isAlreadyAdded) return null; // Skip write

    const {start} = node.range();

    return (
      content.slice(0, start.index + 1) +
      `'${dependency}',` +
      content.slice(start.index + 1)
    );
  });
}
