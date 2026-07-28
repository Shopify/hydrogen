import { afterEach, describe, expect, it, vi } from "vitest";

import {
  configureLogging,
  consoleLogger,
  formatLogPrefix,
  getLogger,
  resetLoggingForTests,
} from "./logging";
import type { HydrogenLogger, LogContext } from "./types";

function createLoggerSpy(): HydrogenLogger & { calls: Array<[string, string, LogContext?]> } {
  const calls: Array<[string, string, LogContext?]> = [];
  const method =
    (level: string) =>
    (message: string, context?: LogContext): void => {
      calls.push([level, message, context]);
    };

  return {
    calls,
    trace: method("trace"),
    debug: method("debug"),
    info: method("info"),
    warn: method("warn"),
    error: method("error"),
    fatal: method("fatal"),
  };
}

afterEach(() => {
  resetLoggingForTests();
  vi.restoreAllMocks();
});

describe("consoleLogger", () => {
  it("prefixes messages with [hydrogen:<level>:<scope>]", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    consoleLogger.error("cart initial load failed", { scope: "cart" });

    expect(errorSpy).toHaveBeenCalledWith("[hydrogen:error:cart] cart initial load failed");
  });

  it("passes context.error as a separate console argument", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const cause = new Error("boom");

    consoleLogger.error("load failed", { scope: "cart", error: cause });

    expect(errorSpy).toHaveBeenCalledWith("[hydrogen:error:cart] load failed", cause);
  });

  it("passes extra context fields as a trailing object", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    consoleLogger.warn("degraded", { scope: "analytics", destination: "meta" });

    expect(warnSpy).toHaveBeenCalledWith("[hydrogen:warn:analytics] degraded", {
      destination: "meta",
    });
  });

  it("routes fatal to console.error and trace to console.debug", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});

    consoleLogger.fatal("unrecoverable", { scope: "cart" });
    consoleLogger.trace("verbose", { scope: "cart" });

    expect(errorSpy).toHaveBeenCalledWith("[hydrogen:fatal:cart] unrecoverable");
    expect(debugSpy).toHaveBeenCalledWith("[hydrogen:trace:cart] verbose");
  });
});

describe("getLogger", () => {
  it("suppresses entries below the default info level", () => {
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    const log = getLogger("cart");
    log.debug("hidden");
    log.info("shown");

    expect(debugSpy).not.toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalledWith("[hydrogen:info:cart] shown");
  });

  it("tags entries with the scope for custom sinks", () => {
    const sink = createLoggerSpy();
    configureLogging({ logger: sink });

    getLogger("shop-pay").error("shop-js failed to load", { error: "boom" });

    expect(sink.calls).toEqual([
      ["error", "shop-js failed to load", { scope: "shop-pay", error: "boom" }],
    ]);
  });

  it("resolves the sink lazily so configureLogging applies to existing loggers", () => {
    const log = getLogger("cart");
    const sink = createLoggerSpy();

    configureLogging({ logger: sink });
    log.error("late binding");

    expect(sink.calls).toEqual([["error", "late binding", { scope: "cart" }]]);
  });

  it("honors a configured level threshold", () => {
    const sink = createLoggerSpy();
    configureLogging({ logger: sink, level: "trace" });

    getLogger("cart").trace("verbose");

    expect(sink.calls).toEqual([["trace", "verbose", { scope: "cart" }]]);
  });

  it("silences everything at level silent", () => {
    const sink = createLoggerSpy();
    configureLogging({ logger: sink, level: "silent" });

    getLogger("cart").fatal("nope");

    expect(sink.calls).toEqual([]);
  });

  it("accepts a pino-style logger whose methods take rest arguments", () => {
    const entries: unknown[][] = [];
    const pinoLike =
      () =>
      (...args: unknown[]): void => {
        entries.push(args);
      };
    configureLogging({
      logger: {
        trace: pinoLike(),
        debug: pinoLike(),
        info: pinoLike(),
        warn: pinoLike(),
        error: pinoLike(),
        fatal: pinoLike(),
      },
    });

    getLogger("cart").error("failed", { error: "boom" });

    expect(entries).toEqual([["failed", { scope: "cart", error: "boom" }]]);
  });
});

describe("configureLogging", () => {
  it("is silent when called twice with identical options", () => {
    const sink = createLoggerSpy();

    configureLogging({ logger: sink, level: "warn" });
    configureLogging({ logger: sink, level: "warn" });

    expect(sink.calls).toEqual([]);
  });

  it("warns via the new sink and applies the new options on reconfigure", () => {
    const first = createLoggerSpy();
    const second = createLoggerSpy();

    configureLogging({ logger: first });
    configureLogging({ logger: second });

    expect(second.calls).toEqual([
      [
        "warn",
        "configureLogging called again; the new configuration replaces the previous one.",
        { scope: "logging" },
      ],
    ]);

    getLogger("cart").error("routed to second");
    expect(first.calls).toEqual([]);
    expect(second.calls).toHaveLength(2);
  });
});

describe("formatLogPrefix", () => {
  it("formats the standard prefix", () => {
    expect(formatLogPrefix("warn", "analytics")).toBe("[hydrogen:warn:analytics]");
  });
});
