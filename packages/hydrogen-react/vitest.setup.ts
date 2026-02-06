import matchers from '@testing-library/jest-dom/matchers';

import {expect} from 'vitest';

expect.extend(matchers);

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
