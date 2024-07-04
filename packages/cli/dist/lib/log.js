import { renderFatalError, renderWarning, renderInfo } from '@shopify/cli-kit/node/ui';
import { BugError } from '@shopify/cli-kit/node/error';
import { outputContent, outputToken } from '@shopify/cli-kit/node/output';
import colors from '@shopify/cli-kit/node/colors';
import { getGraphiQLUrl } from './graphiql-url.js';
import { importLocal } from './import-utils.js';

const originalConsole = { ...console };
const methodsReplaced = /* @__PURE__ */ new Set();
const addedReplacers = /* @__PURE__ */ new Set();
const messageReplacers = [];
function resetAllLogs() {
  Object.assign(console, originalConsole);
  methodsReplaced.clear();
}
function addMessageReplacers(key, ...items) {
  if (!addedReplacers.has(key)) {
    addedReplacers.add(key);
    messageReplacers.push(...items);
  }
}
const printedMessages = /* @__PURE__ */ new Set();
function debounceMessage(args, debounceFor) {
  const key = args.map((item) => {
    const message = item?.message ?? item;
    return typeof message === "string" ? message : "";
  }).filter(Boolean).join("");
  if (printedMessages.has(key)) return true;
  printedMessages.add(key);
  if (debounceFor !== true) {
    setTimeout(() => printedMessages.delete(key), debounceFor ?? 1e3);
  }
  return false;
}
function warningDebouncer([first]) {
  return typeof first === "string" && // Show these warnings only once.
  /\[h2:(warn|info):(createStorefrontClient|createCustomerAccountClient)\]/.test(
    first
  ) ? true : void 0;
}
function injectLogReplacer(method, debouncer) {
  if (!methodsReplaced.has(method)) {
    methodsReplaced.add(method);
    console[method] = (...args) => {
      if (debouncer !== false && debounceMessage(args, debouncer?.(args))) {
        return;
      }
      const replacers = messageReplacers.reduce((acc, [matcher, replacer]) => {
        if (matcher(args, acc.length)) acc.push(replacer);
        return acc;
      }, []);
      if (replacers.length === 0) return originalConsole[method](...args);
      const result = replacers.reduce(
        (resultArgs, replacer) => resultArgs && replacer(resultArgs),
        args
      );
      if (result) return originalConsole[method](...result);
    };
  }
}
function muteDevLogs({ workerReload } = {}) {
  injectLogReplacer("log");
  injectLogReplacer("error");
  injectLogReplacer("warn", warningDebouncer);
  injectLogReplacer("debug", false);
  let isFirstWorkerReload = true;
  addMessageReplacers("dev-node", [
    ([first]) => typeof first === "string" && first.includes("[mf:"),
    (args) => {
      const first = args[0];
      if (workerReload !== false && first.includes("Worker reloaded")) {
        if (isFirstWorkerReload) {
          isFirstWorkerReload = false;
          return;
        }
        return [first.replace("[mf:inf] ", "\u{1F504} ") + "\n", ...args.slice(1)];
      }
      if (!first.includes("[mf:err]")) {
        return;
      }
    }
  ]);
  addMessageReplacers(
    "dev-workerd",
    // Workerd logs
    [
      ([first]) => typeof first === "string" && /^\x1B\[31m(workerd\/|stack:( (0|[a-f\d]{4,})){3,})/.test(first),
      () => {
      }
    ],
    [
      ([first]) => typeof first === "string" && /\$LLVM_SYMBOLIZER|recursive isolate lock/.test(first),
      () => {
      }
    ],
    // Non-actionable warnings:
    [
      ([first]) => typeof first === "string" && /^A promise rejection/i.test(first),
      () => {
      }
    ],
    [
      ([first]) => typeof first === "string" && /resolved to multiple addresses/i.test(first),
      // For win32
      () => {
      }
    ],
    // Non-actionable errors:
    [
      ([first]) => {
        const message = first?.message ?? first;
        return typeof message === "string" && /^Network connection lost/i.test(message);
      },
      () => {
      }
    ]
  );
  let isLastLineBlank = false;
  let isLastLineRequestLog = false;
  addMessageReplacers(
    "dev-vite",
    // Vite logs
    [
      // This log must come from Rollup and does not go through Vite's customLogger
      ([first]) => typeof first === "string" && /^Sourcemap for .*@remix-run/i.test(first),
      () => {
      }
    ],
    [
      // Log generated from Workerd HMR connection to Vite
      ([first]) => typeof first === "string" && /^\[vite\] (connected|program reload)/i.test(first),
      () => {
      }
    ],
    [
      // Log that gets entangled with our initial dev logs
      ([first]) => typeof first === "string" && /^Re-optimizing dependencies because/i.test(first),
      () => {
      }
    ],
    [
      // This error is fixed in new Remix versions:
      // https://github.com/remix-run/remix/pull/9194
      ([first]) => {
        const message = first?.message ?? first;
        return /virtual-routes/.test(message) && /(Failed to load url|Could not resolve module for file)/i.test(
          message
        );
      },
      () => {
      }
    ],
    [
      // This log must come from Rollup and does not go through Vite's customLogger
      ([first]) => typeof first === "string" && /^Generated an empty chunk:/i.test(first),
      () => {
      }
    ],
    [
      // Log new lines between Request logs and other logs
      ([first], existingMatches) => {
        if (existingMatches === 0 && typeof first === "string") {
          const isRequestLog = /^\s+[A-Z]+\s+\d{3}\s+[a-z]+\s+\//.test(
            // Clear ANSI colors before matching
            first.replace(/\u001b\[.*?m/g, "")
          );
          if (!isLastLineBlank && (isRequestLog && !isLastLineRequestLog || !isRequestLog && isLastLineRequestLog)) {
            process.stdout.write("\n");
          }
          isLastLineRequestLog = isRequestLog;
          isLastLineBlank = /\n$/.test(first);
        }
        return false;
      },
      (params) => params
    ]
  );
  const processStderrWrite = process.stderr.write;
  const timeout = setTimeout(() => {
    process.stderr.write = processStderrWrite;
  }, 5e3);
  process.stderr.write = (...args) => {
    if (typeof args[0] === "string" && args[0].includes("Could not find ts-node")) {
      clearTimeout(timeout);
      process.stderr.write = processStderrWrite;
      return false;
    }
    return processStderrWrite.apply(process.stderr, args);
  };
}
const originalWrite = process.stdout.write;
function muteAuthLogs({
  onPressKey,
  onKeyTimeout
}) {
  if (process.stdout.write === originalWrite) {
    const write = originalWrite.bind(process.stdout);
    process.stdout.write = (item, cb) => {
      if (typeof item !== "string") return write(item, cb);
      const replacers = messageReplacers.reduce((acc, [matcher, replacer]) => {
        if (matcher([item], acc.length)) acc.push(replacer);
        return acc;
      }, []);
      if (replacers.length === 0) return write(item, cb);
      const result = replacers.reduce(
        (resultArgs, replacer) => resultArgs && replacer(resultArgs),
        [item]
      );
      if (result) return write(result[0], cb);
    };
  }
  addMessageReplacers(
    "auth",
    [
      ([first]) => typeof first === "string" && first.includes("Auto-open"),
      ([first]) => {
        const content = first.replace(" to Shopify Partners", "");
        const link = content.match(/(https?:\/\/.*)Log in/)?.[1];
        onKeyTimeout(link);
        if (link) return;
        return [content];
      }
    ],
    [
      ([first]) => typeof first === "string" && first.includes("\u{1F449}"),
      () => {
        onPressKey();
        return;
      }
    ],
    [
      ([first]) => typeof first === "string" && (first.includes("Shopify Partners") || first.includes("Logged in")),
      () => {
        return;
      }
    ]
  );
  return () => {
    process.stdout.write = originalWrite;
  };
}
function enhanceH2Logs(options) {
  injectLogReplacer("error");
  injectLogReplacer("warn", warningDebouncer);
  injectLogReplacer("log", warningDebouncer);
  injectLogReplacer("info", warningDebouncer);
  addMessageReplacers("h2-warn", [
    ([first]) => {
      const message = first?.message ?? first;
      return typeof message === "string" && message.includes("[h2:");
    },
    (args) => {
      const firstArg = args[0];
      const errorObject = typeof firstArg === "object" && !!firstArg.stack ? firstArg : void 0;
      let stringArg = errorObject?.message ?? firstArg;
      if (stringArg.startsWith("[h2:info:createStorefrontClient]") && stringArg.includes("defaulting to mock.shop")) {
        stringArg += "\nRun `h2 link` to link your store.";
      }
      const [, type, scope, message] = stringArg.match(/\[h2:([^:]+):([^\]]+)\]\s+(.*)$/ims) || [];
      if (!type || !scope || !message) return args;
      const headline = `In Hydrogen's \`${scope.trim()}\`:

`;
      const lines = message.split("\n");
      let lastLine = lines.at(-1) ?? "";
      const hasLinks = /https?:\/\//.test(lastLine);
      const hasCommands = /`h2 [^`]+`/.test(lastLine);
      if (hasCommands && lastLine) {
        lastLine = lastLine.replace(
          /`(h2) ([^`]+)`/g,
          colors.magentaBright(`\`${options.cliCommand ?? "$1"} $2\``)
        );
      }
      if (hasLinks || hasCommands) lines.pop();
      if (type === "error" || errorObject) {
        let tryMessage = hasLinks || hasCommands ? lastLine : void 0;
        let stack = errorObject?.stack;
        let cause = errorObject?.cause;
        if (typeof cause === "string") {
          try {
            cause = JSON.parse(cause);
          } catch {
          }
        }
        if (typeof cause !== "string" && !!cause?.graphql?.query) {
          const link = getGraphiQLUrl({
            host: options.host,
            graphql: cause.graphql
          });
          const [, queryType, queryName] = cause.graphql.query.match(/(query|mutation)\s+(\w+)/) || [];
          tryMessage = (tryMessage ? `${tryMessage}

` : "") + outputContent`To debug the ${queryType || "query"}${queryName ? ` \`${colors.whiteBright(queryName)}\`` : ""}, try it in ${outputToken.link(colors.bold("GraphiQL"), link)}.`.value;
        }
        const stackLines = stack?.split("\n") ?? [];
        const isAppLine = (line) => line.includes(options.rootDirectory) && !line.includes("node_modules");
        const firstAppLineIndex = stackLines.findIndex(isAppLine);
        const lastAppLineIndex = stackLines.length - [...stackLines].reverse().findIndex(isAppLine);
        if (firstAppLineIndex > 0 && lastAppLineIndex > firstAppLineIndex) {
          stack = [
            stackLines[0],
            // Error message
            ...stackLines.slice(firstAppLineIndex, lastAppLineIndex)
            // App code
          ].join("\n").trim() || void 0;
        }
        const error = new BugError(
          headline + colors.bold(lines.join("\n").replace(" - Request", "\nRequest")),
          tryMessage
        );
        error.cause = cause;
        error.stack = stack;
        renderFatalError(error);
        return;
      }
      let reference = void 0;
      if (hasLinks) {
        reference = [];
        for (const link of lastLine.matchAll(/https?:\/\/[^\s]+/g)) {
          reference.push(link[0]);
        }
      }
      const render = type === "warn" ? renderWarning : renderInfo;
      render({
        body: headline + colors.bold(lines.join("\n")),
        reference,
        nextSteps: hasCommands ? [lastLine] : void 0
      });
      return;
    }
  ]);
}
const warnings = /* @__PURE__ */ new Set();
const warnOnce = (string) => {
  if (!warnings.has(string)) {
    console.warn(string);
    warnings.add(string);
  }
};
function createRemixLogger() {
  const noop = () => {
  };
  const buildMessageBody = (message, details) => `In Remix:

` + colors.bold(message) + (details ? "\n\n" + details.join("\n") : "");
  return {
    dev: noop,
    info: noop,
    debug: noop,
    warn: (message, options) => {
      renderWarning({ body: buildMessageBody(message, options?.details) });
    },
    error: (message, options) => {
      renderFatalError({
        name: "error",
        type: 0,
        message: buildMessageBody(message, options?.details),
        skipOclifErrorHandling: true,
        tryMessage: ""
      });
    }
  };
}
async function muteRemixLogs(root) {
  try {
    const { logger } = await importLocal(
      "@remix-run/dev/dist/tux/logger.js",
      root
    );
    logger.warn = logger.debug = logger.info = () => {
    };
  } catch {
  }
}
function setH2OVerbose() {
  if (!process.env.DEBUG || process.env.DEBUG === "*") {
    process.env.DEBUG = "h2:*,o2:*";
  } else {
    process.env.DEBUG += ",h2:*,o2:*";
  }
}
function isH2Verbose() {
  return !!(process.env.DEBUG === "*" || process.env.DEBUG?.includes("h2:*"));
}

export { addMessageReplacers, createRemixLogger, enhanceH2Logs, isH2Verbose, muteAuthLogs, muteDevLogs, muteRemixLogs, resetAllLogs, setH2OVerbose, warnOnce };
