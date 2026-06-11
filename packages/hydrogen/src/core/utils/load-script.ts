/**
 * Inlined from @shopify/hydrogen-react/load-script.
 * Pure DOM script loader with no framework dependency.
 */

const SCRIPTS_LOADED: Record<string, Promise<boolean>> = {};

type LoadScriptOptions = {
  module?: boolean;
  in?: "head" | "body";
  attributes?: Record<string, string>;
};

export function loadScript(src: string, options?: LoadScriptOptions): Promise<boolean> {
  const isScriptLoaded = SCRIPTS_LOADED[src];
  if (isScriptLoaded) return isScriptLoaded;

  const promise = new Promise<boolean>((resolve, reject) => {
    const script = document.createElement("script");
    script.type = options?.module ? "module" : "text/javascript";
    script.src = src;
    script.addEventListener("load", () => resolve(true));
    script.addEventListener("error", () => {
      delete SCRIPTS_LOADED[src];
      reject(false);
    });

    if (options?.in === "head") {
      document.head.appendChild(script);
    } else {
      document.body.appendChild(script);
    }

    if (options?.attributes) {
      const { attributes } = options;
      Object.keys(attributes).forEach((key) => {
        script.setAttribute(key, attributes[key]);
      });
    }
  });

  SCRIPTS_LOADED[src] = promise;
  return promise;
}
