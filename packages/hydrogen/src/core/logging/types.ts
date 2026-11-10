/**
 * Logging contract for `@shopify/hydrogen` runtime failures.
 *
 * The interface is intentionally minimal and structural: any logger with these
 * level methods can receive Hydrogen entries. Hydrogen never depends on a
 * specific logging library.
 */

/** The log severities, from lowest to highest. Set `silent` to turn off all output. */
export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal" | "silent";

/**
 * Structured details attached to a log entry. Extra fields pass through to the logger.
 *
 * @publicDocs
 */
export type LogContext = {
  /** The Hydrogen subsystem that wrote the entry, such as `cart` or `analytics`. */
  scope?: string;
  /** The caught value when the entry reports a failure. */
  error?: unknown;
  [key: string]: unknown;
};

/**
 * Writes one log entry at the severity of the logger method.
 */
type LogFn =
  /**
   * @param message - The entry text, without a prefix.
   * @param context - Structured details about the entry, including the subsystem scope.
   * @returns Nothing. Hydrogen ignores the return value.
   */
  (message: string, context?: LogContext) => void;

/**
 * A logger that receives Hydrogen's log entries. Pass your logger to `configureLogging`. Without
 * one, Hydrogen writes to the console.
 *
 * Messages arrive without a prefix, and the context scope names the subsystem. The built-in
 * console logger formats entries as `[hydrogen:<level>:<scope>] <message>`. The console logger
 * writes trace entries with `console.debug` and fatal entries with `console.error`.
 *
 * When a custom logger throws, Hydrogen reports the failure through the console logger and continues the operation that logged the entry. Catch network errors inside a custom logger to keep a monitoring outage from writing a console error for every entry.
 */
export interface HydrogenLogger {
  /** Receives trace entries, the lowest severity. */
  trace: LogFn;
  /** Receives debug entries. */
  debug: LogFn;
  /** Receives info entries. Info is the default minimum severity. */
  info: LogFn;
  /** Receives warning entries. */
  warn: LogFn;
  /** Receives error entries. */
  error: LogFn;
  /** Receives fatal entries, the highest severity. */
  fatal: LogFn;
}

export const DEFAULT_LOG_LEVEL: LogLevel = "info";

const LOG_LEVEL_VALUES: Record<LogLevel, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
  silent: Number.POSITIVE_INFINITY,
};

/** The severity of a log entry. Every level except `silent`. */
export type LogSeverity = Exclude<LogLevel, "silent">;

export function isLevelEnabled(level: LogSeverity, threshold: LogLevel): boolean {
  return LOG_LEVEL_VALUES[level] >= LOG_LEVEL_VALUES[threshold];
}
