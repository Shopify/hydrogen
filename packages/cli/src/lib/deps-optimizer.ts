import {AbortError, BugError} from '@shopify/cli-kit/node/error';
import {extname} from '@shopify/cli-kit/node/path';
import {renderFatalError} from '@shopify/cli-kit/node/ui';
import colors from '@shopify/cli-kit/node/colors';
import {type FormatOptions} from './format-code.js';
import {importLangAstGrep} from './ast.js';
import {replaceFileContent} from './file.js';
import {outputInfo} from '@shopify/cli-kit/node/output';

const throttledOptimizableDeps = new Set<string>();
let debouncedBannerTimeout: NodeJS.Timeout | undefined;

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
      } else if (!throttledOptimizableDeps.has(optimizableDependency)) {
        // When multiple requests hit the same error, we only want to
        // to log and add the dependency to the Vite config once.
        throttledOptimizableDeps.add(optimizableDependency);
        setTimeout(
          () => throttledOptimizableDeps.delete(optimizableDependency),
          2000,
        );

        addToViteOptimizeDeps(
          optimizableDependency,
          configFile,
          await formatOptionsPromise,
          cleanStack,
        )
          .then(() => {
            setTimeout(() => {
              outputInfo(
                `\nAdded '${colors.yellow(
                  optimizableDependency,
                )}' to your Vite config's ssr.optimizeDeps.include\n`,
              );
            }, 200);

            clearTimeout(debouncedBannerTimeout);
            debouncedBannerTimeout = setTimeout(showSuccessBanner, 2000);
          })
          .catch((error) => {
            clearTimeout(debouncedBannerTimeout);
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
  errorStack: string,
) {
  const ext = extname(configFile).replace(/^\.m?/, '') as 'ts' | 'js';
  const astGrep = await importLangAstGrep(ext);

  await replaceFileContent(configFile, formatOptions, (content) => {
    const root = astGrep.parse(content).root();
    const node = root.find(ssrOptimizeDepsIncludeRule);

    if (!node) {
      throw new AbortError(
        `The dependency "${dependency}" needs to be optimized but couldn't be added to the Vite config.`,
        `Add the following code manually to your Vite config:\n\nssr: {optimizeDeps: {include: ['${dependency}']}}`,
      );
    }

    const isAlreadyAdded = !!node.find({
      rule: {
        kind: 'string_fragment',
        regex: `^${dependency}$`,
      },
    });

    if (isAlreadyAdded) {
      // The dependency is already included in the Vite config
      // but we still get the error. This probably means that
      // what we added to optimizeDeps is wrong so we should
      // print the error stack to the user for manual fixing:
      const error = new BugError(
        `A dependency related to "${dependency}" might need to be optimized by Vite` +
          ` but we could not figure it out automatically:\n\n${colors.dim(
            errorStack.split('\n')[0],
          )}`,
        `If your app doesn't load, please check the following error stack and fix it manually by adding your dependency to Vite's \`ssr.optimizeDeps.include\` array.`,
      );
      error.stack = errorStack;
      throw error;
    }

    const {start} = node.range();

    return (
      content.slice(0, start.index + 1) +
      `'${dependency}',` +
      content.slice(start.index + 1)
    );
  });
}
