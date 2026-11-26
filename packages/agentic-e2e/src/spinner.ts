/** One terminal column each. */
export const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"] as const;
export const SPINNER_INTERVAL_MS = 80;

/**
 * One temporary line that redraws in place. It writes only `\r`, the text, and spaces: no other
 * control characters. Every other write to the same terminal must call `clear` first. The next
 * frame then draws the line again, below that output. The line never wraps: each frame and each
 * erase reads the current terminal width and leaves the last column unused, so a narrow terminal
 * gets a cut line, and a 1-column terminal gets no line.
 */
export type Spinner = {
  /** Draws `line(frame)` now and then every `SPINNER_INTERVAL_MS`, until `stop`. */
  start: (line: (frame: string) => string) => void;
  /** Erases the line. A no-op when no line is shown. */
  clear: () => void;
  /** Stops the timer and erases the line. Safe to call more than once. */
  stop: () => void;
};

/** For output that is not an interactive terminal: it writes nothing and starts no timer. */
export const SILENT_SPINNER: Spinner = {
  start: () => undefined,
  clear: () => undefined,
  stop: () => undefined,
};

type TerminalStream = { isTTY?: boolean };

/**
 * Only when stdout and stderr are both interactive terminals and `CI` is not set. A redirected
 * stream (file, pipe) or CI gets no animation.
 */
export function canAnimate(
  streams: { stdout: TerminalStream; stderr: TerminalStream },
  env: NodeJS.ProcessEnv,
): boolean {
  return streams.stdout.isTTY === true && streams.stderr.isTTY === true && (env.CI ?? "") === "";
}

/** `columns` is the current terminal width, as on a TTY stream. Without it, no limit. */
export function createSpinner(output: {
  write: (chunk: string) => unknown;
  columns?: number;
}): Spinner {
  let timer: NodeJS.Timeout | undefined;
  let line: ((frame: string) => string) | undefined;
  let frame = 0;
  /** The length of the text on screen. 0: nothing to erase. */
  let shown = 0;

  /** The columns that a write can use now without a wrap: all but the last one. */
  const room = (): number =>
    output.columns === undefined ? Infinity : Math.max(output.columns - 1, 0);
  const erase = (): string => {
    // After a resize to a narrower terminal, spaces up to the old length would wrap.
    const text = shown === 0 ? "" : `\r${" ".repeat(Math.min(shown, room()))}\r`;
    shown = 0;
    return text;
  };
  const draw = (): void => {
    if (line === undefined) return;
    const text = line(SPINNER_FRAMES[frame % SPINNER_FRAMES.length] ?? "").slice(0, room());
    frame += 1;
    const chunk = `${erase()}${text}`;
    if (chunk !== "") output.write(chunk);
    shown = text.length;
  };
  const clear = (): void => {
    if (shown > 0) output.write(erase());
  };
  const stop = (): void => {
    clearInterval(timer);
    timer = undefined;
    line = undefined;
    clear();
  };

  return {
    start: (next) => {
      stop();
      line = next;
      frame = 0;
      draw();
      timer = setInterval(draw, SPINNER_INTERVAL_MS);
      // The spinner never keeps the process alive.
      timer.unref();
    },
    clear,
    stop,
  };
}
