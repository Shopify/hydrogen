import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  canAnimate,
  createSpinner,
  SILENT_SPINNER,
  SPINNER_FRAMES,
  SPINNER_INTERVAL_MS,
} from "./spinner.ts";

let writes: string[];
const output = { write: (chunk: string) => writes.push(chunk) };
const line = (frame: string) => `${frame} x`;
const long = (frame: string) => `  ${frame} running      choose-a-variant`;
const ERASE = "\r   \r";

beforeEach(() => {
  writes = [];
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("createSpinner", () => {
  it("draws the first frame at once, then the next frames in place", () => {
    const spinner = createSpinner(output);

    spinner.start(line);
    expect(writes).toEqual(["⠋ x"]);

    vi.advanceTimersByTime(SPINNER_INTERVAL_MS * 2);
    expect(writes).toEqual(["⠋ x", `${ERASE}⠙ x`, `${ERASE}⠹ x`]);

    vi.advanceTimersByTime(SPINNER_INTERVAL_MS * (SPINNER_FRAMES.length - 2));
    expect(writes.at(-1)).toBe(`${ERASE}⠋ x`);
    spinner.stop();
  });

  it("erases the line on clear, and draws it again at the next frame", () => {
    const spinner = createSpinner(output);
    spinner.start(line);

    spinner.clear();
    spinner.clear();
    expect(writes).toEqual(["⠋ x", ERASE]);

    vi.advanceTimersByTime(SPINNER_INTERVAL_MS);
    expect(writes).toEqual(["⠋ x", ERASE, "⠙ x"]);
    spinner.stop();
  });

  it("stops the timer and erases the line once on stop", () => {
    const spinner = createSpinner(output);
    spinner.start(line);

    spinner.stop();
    spinner.stop();
    vi.advanceTimersByTime(SPINNER_INTERVAL_MS * 3);

    expect(writes).toEqual(["⠋ x", ERASE]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("replaces the line and keeps one timer when it starts again", () => {
    const spinner = createSpinner(output);
    spinner.start(line);

    spinner.start((frame) => `${frame} yy`);
    expect(writes).toEqual(["⠋ x", ERASE, "⠋ yy"]);
    expect(vi.getTimerCount()).toBe(1);
    spinner.stop();
    expect(writes.at(-1)).toBe("\r    \r");
  });

  it("cuts the line to the current width less one column, and reads the width again on each frame", () => {
    const terminal = { write: output.write, columns: 20 };
    const spinner = createSpinner(terminal);

    spinner.start(long);
    expect(writes).toEqual(["  ⠋ running      ch"]);

    // Narrower: the erase and the next frame both fit in 9 columns.
    terminal.columns = 10;
    vi.advanceTimersByTime(SPINNER_INTERVAL_MS);
    expect(writes.at(-1)).toBe(`\r${" ".repeat(9)}\r  ⠙ runni`);

    // No room: the line is erased and no frame is drawn.
    terminal.columns = 1;
    vi.advanceTimersByTime(SPINNER_INTERVAL_MS);
    expect(writes.at(-1)).toBe("\r\r");
    vi.advanceTimersByTime(SPINNER_INTERVAL_MS);
    expect(writes).toHaveLength(3);

    // Wider again: the full line.
    terminal.columns = 80;
    vi.advanceTimersByTime(SPINNER_INTERVAL_MS);
    expect(writes.at(-1)).toBe(long("⠼"));

    // A resize after the frame: the erase fits the new width.
    terminal.columns = 20;
    spinner.stop();
    expect(writes.at(-1)).toBe(`\r${" ".repeat(19)}\r`);
  });

  it("writes nothing and starts no timer when silent", () => {
    SILENT_SPINNER.start(line);
    vi.advanceTimersByTime(SPINNER_INTERVAL_MS);
    SILENT_SPINNER.clear();
    SILENT_SPINNER.stop();

    expect(writes).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("canAnimate", () => {
  const tty = { isTTY: true };
  const redirected = {};

  it.each([
    { stdout: tty, stderr: tty, env: {}, animates: true },
    { stdout: tty, stderr: tty, env: { CI: "" }, animates: true },
    { stdout: tty, stderr: tty, env: { CI: "true" }, animates: false },
    { stdout: tty, stderr: tty, env: { CI: "1" }, animates: false },
    { stdout: redirected, stderr: tty, env: {}, animates: false },
    { stdout: tty, stderr: redirected, env: {}, animates: false },
    { stdout: { isTTY: false }, stderr: { isTTY: false }, env: {}, animates: false },
  ])(
    "is $animates for stdout $stdout, stderr $stderr, env $env",
    ({ animates, env, ...streams }) => {
      expect(canAnimate(streams, env)).toBe(animates);
    },
  );
});
