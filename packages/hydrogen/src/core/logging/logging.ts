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

function formatLogPrefix(level: LogSeverity, scope: string): string {
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
 * The built-in logger. Writes each entry to the matching console method, with a
 * `[hydrogen:<level>:<scope>]` prefix when the entry has a scope, followed by the error and any
 * extra context fields. Trace entries use `console.debug`, and fatal entries use `console.error`.
 */
export const consoleLogger: HydrogenLogger = {
  trace: (message, context) => writeToConsole("trace", message, context),
  debug: (message, context) => writeToConsole("debug", message, context),
  info: (message, context) => writeToConsole("info", message, context),
  warn: (message, context) => writeToConsole("warn", message, context),
  error: (message, context) => writeToConsole("error", message, context),
  fatal: (message, context) => writeToConsole("fatal", message, context),
};

/** The logger and minimum severity for Hydrogen log entries. */
export type ConfigureLoggingOptions = {
  /** Receives all entries at or above `level`. Defaults to the built-in console logger. */
  logger?: HydrogenLogger;
  /** The minimum severity that Hydrogen forwards to the logger. Defaults to `"info"`. */
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
 * Sets the logger and minimum log level for every Hydrogen helper in the current JavaScript
 * context. Call the function once at startup. In the browser, call it at app entry. On the server,
 * call it during module initialization.
 *
 * Each call replaces the previous configuration, and options that the call omits reset to their
 * defaults. The new configuration also applies to helpers that loaded before the call. The inline
 * analytics and consent scripts that Hydrogen serializes into HTML run outside the app bundle.
 * These scripts always write to the console with the standard prefix and ignore a custom logger.
 *
 * @param options The logger that receives entries and the minimum severity to forward.
 * @returns Nothing.
 * @publicDocs
 */
export function configureLogging(options: ConfigureLoggingOptions): void {
  const logger = options.logger ?? consoleLogger;
  const level = options.level ?? DEFAULT_LOG_LEVEL;

  state.logger = logger;
  state.level = level;
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
