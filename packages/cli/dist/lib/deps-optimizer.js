import { BugError, AbortError } from '@shopify/cli-kit/node/error';
import { extname } from '@shopify/cli-kit/node/path';
import { renderFatalError } from '@shopify/cli-kit/node/ui';
import colors from '@shopify/cli-kit/node/colors';
import { importLangAstGrep } from './ast.js';
import { replaceFileContent } from './file.js';
import { outputInfo } from '@shopify/cli-kit/node/output';

const throttledOptimizableDeps = /* @__PURE__ */ new Set();
let debouncedBannerTimeout;
function createEntryPointErrorHandler({
  disableDepsOptimizer,
  showSuccessBanner,
  configFile,
  formatOptionsPromise
}) {
  return async function entryPointErrorHandler({
    optimizableDependency,
    stack
  }) {
    const message = stack.split("\n")[0] ?? stack;
    const cleanStack = stack.split("\n").filter((line) => !line.includes("virtual:remix")).join("\n");
    const headline = "MiniOxygen encountered an error while running your app's entry point";
    if (optimizableDependency) {
      if (disableDepsOptimizer || !configFile) {
        const depError = new BugError(
          `${headline}:

${colors.dim(message)}`,
          `Try adding '${colors.yellow(
            optimizableDependency
          )}' to your Vite config in ssr.optimizeDeps.include`
        );
        depError.stack = cleanStack;
        renderFatalError(depError);
      } else if (!throttledOptimizableDeps.has(optimizableDependency)) {
        throttledOptimizableDeps.add(optimizableDependency);
        setTimeout(
          () => throttledOptimizableDeps.delete(optimizableDependency),
          2e3
        );
        addToViteOptimizeDeps(
          optimizableDependency,
          configFile,
          await formatOptionsPromise,
          cleanStack
        ).then(() => {
          setTimeout(() => {
            outputInfo(
              `
Added '${colors.yellow(
                optimizableDependency
              )}' to your Vite config in ssr.optimizeDeps.include
`
            );
          }, 200);
          clearTimeout(debouncedBannerTimeout);
          debouncedBannerTimeout = setTimeout(showSuccessBanner, 2e3);
        }).catch((error) => {
          clearTimeout(debouncedBannerTimeout);
          renderFatalError(error);
        });
      }
    } else {
      const unknownError = new BugError(
        headline + ":\n\n" + colors.dim(message)
      );
      unknownError.stack = cleanStack;
      renderFatalError(unknownError);
    }
  };
}
const ssrOptimizeDepsIncludeRule = {
  rule: {
    pattern: "[$$$]",
    inside: {
      kind: "pair",
      stopBy: "end",
      has: {
        field: "key",
        regex: "include",
        stopBy: "end"
      },
      inside: {
        kind: "pair",
        stopBy: "end",
        has: {
          field: "key",
          regex: "optimizeDeps",
          stopBy: "end"
        },
        inside: {
          kind: "pair",
          stopBy: "end",
          has: {
            field: "key",
            regex: "ssr",
            stopBy: "end"
          }
        }
      }
    }
  }
};
async function addToViteOptimizeDeps(dependency, configFile, formatOptions, errorStack) {
  const ext = extname(configFile).replace(/^\.m?/, "");
  const astGrep = await importLangAstGrep(ext);
  await replaceFileContent(configFile, formatOptions, (content) => {
    const root = astGrep.parse(content).root();
    const node = root.find(ssrOptimizeDepsIncludeRule);
    if (!node) {
      throw new AbortError(
        `The dependency '${colors.yellow(
          dependency
        )}' needs to be optimized by Vite, but couldn't be added to the Vite config.`,
        `Add the following code manually to your Vite config:

` + colors.yellow(`ssr: {optimizeDeps: {include: ['${dependency}']}}`)
      );
    }
    const isAlreadyAdded = !!node.find({
      rule: {
        kind: "string_fragment",
        regex: `^${dependency}$`
      }
    });
    if (isAlreadyAdded) {
      const error = new BugError(
        `A dependency related to '${colors.yellow(
          dependency
        )}' might need to be optimized by Vite but couldn't be configured automatically:

${colors.dim(
          errorStack.split("\n")[0]
        )}`,
        `If your app doesn't load, check the following stack trace and try fixing the problem by adding the imported dependency to the \`ssr.optimizeDeps.include\` array in your Vite config file.`
      );
      error.stack = errorStack;
      throw error;
    }
    const { start } = node.range();
    return content.slice(0, start.index + 1) + `'${dependency}',` + content.slice(start.index + 1);
  });
}

export { addToViteOptimizeDeps, createEntryPointErrorHandler };
