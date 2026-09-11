import {
  DEFAULT_LOG_LEVEL,
  isLevelEnabled,
  type HydrogenLogger,
  type LogContext,
  type LogLevel,
  type LogSeverity,
} from "./types";

const CONSOLE_METHODS: Record<LogSeverity, "debug" | "info" | "warn" | "error"> = {
  // `console.trace` prints a stack trace for every call, which is too noisy
  // for level-gated trace logs; route it to `console.debug` instead.
  trace: "debug",
  debug: "debug",
  info: "info",
  warn: "warn",
  error: "error",
  fatal: "error",
};

export function formatLogPrefix(level: LogSeverity, scope: string): string {
  return `[hydrogen:${level}:${scope}]`;
}

function writeToConsole(level: LogSeverity, message: string, context?: LogContext): void {
  const { scope, error, ...rest } = context ?? {};
  const prefixed = scope ? `${formatLogPrefix(level, scope)} ${message}` : message;
  const args: unknown[] = [prefixed];
  if (error !== undefined) args.push(error);
  if (Object.keys(rest).length > 0) args.push(rest);

  // oxlint-disable-next-line no-console -- The built-in sink is the one sanctioned console call site.
  console[CONSOLE_METHODS[level]](...args);
}

/**
 * Built-in sink: writes `[hydrogen:<level>:<scope>] <message>` to a
 * level-specific `console` method, followed by `context.error` and any extra
 * context fields. `trace` uses `console.debug`; `fatal` uses `console.error`.
 */
export const consoleLogger: HydrogenLogger = {
  trace: (message, context) => writeToConsole("trace", message, context),
  debug: (message, context) => writeToConsole("debug", message, context),
  info: (message, context) => writeToConsole("info", message, context),
  warn: (message, context) => writeToConsole("warn", message, context),
  error: (message, context) => writeToConsole("error", message, context),
  fatal: (message, context) => writeToConsole("fatal", message, context),
};

export type ConfigureLoggingOptions = {
  /** Receives all entries at or above `level`. Defaults to the built-in console logger. */
  logger?: HydrogenLogger;
  /** Minimum severity forwarded to the logger. Defaults to `"info"`. */
  level?: LogLevel;
};

type LoggingState = {
  logger: HydrogenLogger;
  level: LogLevel;
};

const state: LoggingState = {
  logger: consoleLogger,
  level: DEFAULT_LOG_LEVEL,
};

/**
 * Configures logging for every Hydrogen helper in this JavaScript context.
 * Call it once at startup (app entry on the browser, module init on the
 * server) before Hydrogen helpers run.
 *
 * Reconfiguring with different options applies the new options (last call
 * wins). Inline bootstrap scripts that Hydrogen serializes into HTML
 * (analytics, consent) run outside the app bundle and always write to the
 * console with the standard prefix; they cannot receive a custom logger.
 */
export function configureLogging(options: ConfigureLoggingOptions): void {
  const logger = options.logger ?? consoleLogger;
  const level = options.level ?? DEFAULT_LOG_LEVEL;

  state.logger = logger;
  state.level = level;
}

/** @internal */
export function resetLoggingForTests(): void {
  state.logger = consoleLogger;
  state.level = DEFAULT_LOG_LEVEL;
}

/**
 * Scoped logger used by Hydrogen internals. Entries are level-gated and
 * tagged with `scope`, then forwarded to the configured sink. Resolution is
 * lazy: `configureLogging` affects loggers obtained before or after the call.
 */
type ScopedLogContext = Omit<LogContext, "scope"> & { scope?: never };

type ScopedLogger = Record<LogSeverity, (message: string, context?: ScopedLogContext) => void>;

function emit(scope: string, level: LogSeverity, message: string, context?: LogContext): void {
  if (!isLevelEnabled(level, state.level)) return;

  try {
    state.logger[level](message, { ...context, scope });
  } catch (error) {
    reportLoggerFailure(error, { level, scope, message, context });
  }
}

type FailedLogEntry = {
  level: LogSeverity;
  scope: string;
  message: string;
  context?: LogContext;
};

function reportLoggerFailure(error: unknown, failedEntry: FailedLogEntry): void {
  if (state.logger === consoleLogger) return;

  const fallbackContext: LogContext = {
    scope: "logging",
    error,
    originalLevel: failedEntry.level,
    originalScope: failedEntry.scope,
    originalMessage: failedEntry.message,
  };
  if (failedEntry.context !== undefined) fallbackContext.originalContext = failedEntry.context;

  try {
    consoleLogger.error("configured logger failed", fallbackContext);
  } catch {
    // Logging failures must never change the runtime path that triggered the log.
  }
}

/** @internal Returns the lazily-resolved scoped logger for a Hydrogen subsystem. */
export function getLogger(scope: string): ScopedLogger {
  return {
    trace: (message, context) => emit(scope, "trace", message, context),
    debug: (message, context) => emit(scope, "debug", message, context),
    info: (message, context) => emit(scope, "info", message, context),
    warn: (message, context) => emit(scope, "warn", message, context),
    error: (message, context) => emit(scope, "error", message, context),
    fatal: (message, context) => emit(scope, "fatal", message, context),
  };
}
