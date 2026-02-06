import matchers from '@testing-library/jest-dom/matchers';

import {expect, vi} from 'vitest';

expect.extend(matchers);

vi.mock('@shopify/hydrogen-react/load-script', () => {
  const mockLoadScript = (
    src: string,
    options?: {
      module?: boolean;
      in?: 'head' | 'body';
      attributes?: Record<string, string>;
    },
  ) => {
    const script = document.createElement('script');
    script.type = options?.module ? 'module' : 'text/javascript';
    script.src = src;

    const attributes = options?.attributes;
    if (attributes) {
      Object.keys(attributes).forEach((key) => {
        script.setAttribute(key, attributes[key]);
      });
    }

    if (options?.in === 'head') {
      document.head.appendChild(script);
    } else {
      document.body.appendChild(script);
    }

    return Promise.resolve(true);
  };

  return {
    loadScript: mockLoadScript,
    useLoadScript: (
      src: string,
      options?: Parameters<typeof mockLoadScript>[1],
    ) => {
      void mockLoadScript(src, options);
      return 'done';
    },
  };
});

if (
  !globalThis.localStorage ||
  typeof globalThis.localStorage.getItem !== 'function'
) {
  const storage = new Map<string, string>();

  globalThis.localStorage = {
    get length() {
      return storage.size;
    },
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
    key: (index: number) => Array.from(storage.keys())[index] ?? null,
    removeItem: (key: string) => {
      storage.delete(key);
    },
    clear: () => {
      storage.clear();
    },
  };
}
