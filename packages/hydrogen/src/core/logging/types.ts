/**
 * Logging contract for `@shopify/hydrogen` runtime failures.
 *
 * The interface is intentionally minimal and structural: any logger with these
 * level methods can receive Hydrogen entries. Hydrogen never depends on a
 * specific logging library.
 */

/** Log severities, ordered. `silent` disables all output. */
export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal" | "silent";

/**
 * Structured details attached to a log entry. `scope` names the Hydrogen
 * subsystem (`cart`, `analytics`, `shop-pay`, ...). `error` carries the caught
 * value when the entry reports a failure.
 */
export type LogContext = {
  scope?: string;
  error?: unknown;
  [key: string]: unknown;
};

type LogFn = (message: string, context?: LogContext) => void;

/**
 * Sink that receives Hydrogen log entries. Pass your own logger to
 * `configureLogging`, or rely on the built-in console logger.
 *
 * Messages arrive unprefixed; `context.scope` identifies the subsystem so
 * custom sinks control their own formatting. The built-in console logger
 * formats entries as `[hydrogen:<level>:<scope>] <message>`.
 */
export interface HydrogenLogger {
  trace: LogFn;
  debug: LogFn;
  info: LogFn;
  warn: LogFn;
  error: LogFn;
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

/** Severity actually emitted by a log entry (everything except `silent`). */
export type LogSeverity = Exclude<LogLevel, "silent">;

export function isLevelEnabled(level: LogSeverity, threshold: LogLevel): boolean {
  return LOG_LEVEL_VALUES[level] >= LOG_LEVEL_VALUES[threshold];
}
