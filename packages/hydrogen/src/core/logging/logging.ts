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
 * Built-in sink: writes `[hydrogen:<level>:<scope>] <message>` to the matching
 * `console` method, followed by `context.error` and any extra context fields.
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
  configured: boolean;
};

const state: LoggingState = {
  logger: consoleLogger,
  level: DEFAULT_LOG_LEVEL,
  configured: false,
};

/**
 * Configures logging for every Hydrogen helper in this JavaScript context.
 * Call it once at startup (app entry on the browser, module init on the
 * server) before Hydrogen helpers run.
 *
 * Reconfiguring with different options warns and applies the new options
 * (last call wins). Inline bootstrap scripts that Hydrogen serializes into
 * HTML (analytics, consent) run outside the app bundle and always write to
 * the console with the standard prefix; they cannot receive a custom logger.
 */
export function configureLogging(options: ConfigureLoggingOptions): void {
  const logger = options.logger ?? consoleLogger;
  const level = options.level ?? DEFAULT_LOG_LEVEL;

  const isReconfiguration = state.configured && (logger !== state.logger || level !== state.level);

  state.logger = logger;
  state.level = level;
  state.configured = true;

  if (isReconfiguration) {
    getLogger("logging").warn(
      "configureLogging called again; the new configuration replaces the previous one.",
    );
  }
}

/** @internal */
export function resetLoggingForTests(): void {
  state.logger = consoleLogger;
  state.level = DEFAULT_LOG_LEVEL;
  state.configured = false;
}

/**
 * Scoped logger used by Hydrogen internals. Entries are level-gated and
 * tagged with `scope`, then forwarded to the configured sink. Resolution is
 * lazy: `configureLogging` affects loggers obtained before or after the call.
 */
export type ScopedLogger = Record<LogSeverity, (message: string, context?: LogContext) => void>;

function emit(scope: string, level: LogSeverity, message: string, context?: LogContext): void {
  if (!isLevelEnabled(level, state.level)) return;
  state.logger[level](message, { scope, ...context });
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
