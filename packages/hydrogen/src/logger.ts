type LoggerMethod = (
  context: {request: Request},
  ...args: Array<any>
) => void | Promise<any>;

interface LoggerOptions {
  trace: LoggerMethod;
  debug: LoggerMethod;
  warn: LoggerMethod;
  error: LoggerMethod;
  fatal: LoggerMethod;
}

export class Logger {
  #waitUntil: (p: Promise<unknown>) => void;
  #request: Request;

  constructor(
    waitUntil: (p: Promise<unknown>) => void,
    request: Request,
    options: Partial<LoggerOptions> = {},
  ) {
    for (const [key, value] of Object.entries(options)) {
      this.defaultLogger[key as keyof LoggerOptions] = value;
    }
    this.#waitUntil = waitUntil;
    this.#request = request;
  }

  trace(...args: Array<unknown>) {
    this.#doLog('trace', ...args);
  }

  debug(...args: Array<unknown>) {
    this.#doLog('debug', ...args);
  }

  warn(...args: Array<unknown>) {
    this.#doLog('warn', ...args);
  }

  error(...args: Array<unknown>) {
    this.#doLog('error', ...args);
  }

  fatal(...args: Array<unknown>) {
    this.#doLog('fatal', ...args);
  }

  #doLog(method: keyof LoggerOptions, ...args: Array<any>) {
    try {
      const maybePromise = this.defaultLogger[method](
        {request: this.#request},
        ...args,
      );
      if (maybePromise instanceof Promise) {
        this.#waitUntil(
          maybePromise.catch((e) => {
            const message = e instanceof Error ? e.stack : e;
            console.error(
              `Promise error from the custom logging implementation for logger.${method} failed:\n${message}`,
            );
          }),
        );
      }
    } catch (e) {
      const message = e instanceof Error ? e.stack : e;
      console.error(
        `The custom logging implementation for logger.${method} failed:\n${message}`,
      );
    }
  }

  defaultLogger: LoggerOptions = {
    trace: (context, ...args) => {
      console.log(...args);
    },

    debug: (context, ...args) => {
      console.log(...args);
    },

    warn: (context, ...args) => {
      console.warn('WARN: ', ...args);
    },

    error: (context, error, ...extra) => {
      const url = context ? ` ${context.request.url}` : '';

      if (error instanceof Error) {
        console.error(`Error processing route:${url}\n${error.stack}`);
      } else {
        console.error(`Error:${url} ${error}`);
      }
    },

    fatal: (context, ...args) => {
      console.error('FATAL: ', ...args);
    },
  };
}
