/**
 * Inlined from @shopify/hydrogen-react/load-script.
 * Pure DOM script loader — no React dependency.
 */

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
  if (isScriptLoaded) return isScriptLoaded;

  const promise = new Promise<boolean>((resolve, reject) => {
    const script = document.createElement('script');
    script.type = options?.module ? 'module' : 'text/javascript';
    script.src = src;
    script.onload = () => resolve(true);
    script.onerror = () => {
      delete SCRIPTS_LOADED[src];
      reject(false);
    };

    if (options?.in === 'head') {
      document.head.appendChild(script);
    } else {
      document.body.appendChild(script);
    }

    if (options?.attributes) {
      Object.keys(options.attributes).forEach((key) => {
        script.setAttribute(key, options.attributes![key]);
      });
    }
  });

  SCRIPTS_LOADED[src] = promise;
  return promise;
}