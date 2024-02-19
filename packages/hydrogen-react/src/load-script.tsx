import {useState, useEffect} from 'react';

const SCRIPTS_LOADED: Record<string, Promise<boolean>> = {};

type LoadScriptOptions = {
  module?: boolean;
  in?: 'head' | 'body';
  attributes?: Record<string, string>;
};

export function loadScript(
  src: string,
  options?: LoadScriptOptions,
): Promise<boolean> {
  const isScriptLoaded = SCRIPTS_LOADED[src];

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  if (isScriptLoaded) {
    return isScriptLoaded;
  }

  const promise = new Promise<boolean>((resolve, reject) => {
    const script = document.createElement('script');
    if (options?.module) {
      script.type = 'module';
    } else {
      script.type = 'text/javascript';
    }
    script.src = src;
    script.onload = (): void => {
      resolve(true);
    };
    script.onerror = (): void => {
      reject(false);
    };
    if (options?.in === 'head') {
      document.head.appendChild(script);
    } else {
      document.body.appendChild(script);
    }

    const attributes = options?.attributes;
    if (attributes) {
      Object.keys(attributes).forEach((key) => {
        script.setAttribute(key, attributes[key]);
      });
    }
  });

  SCRIPTS_LOADED[src] = promise;

  return promise;
}

type LoadScriptParams = Parameters<typeof loadScript>;

/**
 * The `useLoadScript` hook loads an external script tag in the browser. It allows React components to lazy-load large third-party dependencies.
 */
export function useLoadScript(
  url: LoadScriptParams[0],
  options?: LoadScriptParams[1],
): ScriptState {
  const [status, setStatus] = useState<ScriptState>('loading');
  const serializedOptions = JSON.stringify(options);

  useEffect(
    () => {
      loadScript(url, options)
        .then(() => setStatus('done'))
        .catch(() => setStatus('error'));
    },
    // Track changes in options using its serialized version:
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [url, serializedOptions],
  );

  return status;
}

type ScriptState = 'loading' | 'done' | 'error';
