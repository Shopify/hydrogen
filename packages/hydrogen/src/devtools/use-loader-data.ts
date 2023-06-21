import {DeepProxy} from '@qiwi/deep-proxy';

export const TIMEOUT_MS = 2000;

export function createLoaderDataTracker<T extends (arg?: any) => any>(
  originalUseLoaderData: T,
  onUnusedData = defaultCheck,
  timeout = TIMEOUT_MS,
) {
  return ((arg?: any) => {
    const data = originalUseLoaderData(arg);

    const filename =
      new Error().stack
        ?.split('\n')[2]
        // ?.replace(process.cwd(), '')
        .replace(/^\s*at\s+(\/|\\)?/, '') ?? 'unknown';

    return proxyData(data, filename, onUnusedData, timeout);
  }) as T;
}

export function getDeepKeys(obj: Record<string, any>) {
  let keys: string[] = [];

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && value !== null) {
      const subkeys = getDeepKeys(value);

      keys = [
        // Remove array indexes and filter out duplicates after that change
        ...new Set(
          keys.concat(
            subkeys.map(
              (subkey) => key + '.' + subkey.replace(/(^|\.)\d+\./, ''),
            ),
          ),
        ),
      ].filter((key, keyIndex, array) => {
        // Filter out keys that are just shorter paths to longer keys
        return !array.find(
          (anotherKey, anotherKeyIndex) =>
            keyIndex !== anotherKeyIndex && anotherKey.startsWith(key),
        );
      });
    } else {
      keys.push(key);
    }
  }

  return keys;
}

function defaultCheck({
  filename,
  properties,
}: {
  filename: string;
  properties: string[];
}) {
  console.log({filename, properties});
}

function proxyData<T extends Record<string, any>>(
  data: T,
  filename: string,
  onUnusedData = defaultCheck,
  timeout = TIMEOUT_MS,
) {
  const requestedFields = getDeepKeys(data);

  // Record fields that are read in the proxy to compare later.
  const readFieldsMap: Record<string, any> = {};

  const hasReadALongerKey = (prop: string) =>
    !!Object.keys(readFieldsMap).find((field) => field.startsWith(prop));

  let isCheckedOnce = false;
  const checkFields = (check = onUnusedData!) => {
    isCheckedOnce = true;

    const properties = requestedFields
      .filter(
        (prop) =>
          !(readFieldsMap[prop] || hasReadALongerKey(prop)) &&
          !prop.endsWith('.__typename'),
      )
      .map((prop) => prop.replace(/\.edges\./g, '.').replace(/\.node\./g, '.'));

    if (properties.length > 0) {
      return check({filename, properties});
    }
  };

  let readTimeout: ReturnType<typeof setTimeout>;

  return new DeepProxy(data, ({trapName, value, key, path, DEFAULT, PROXY}) => {
    if (trapName === 'get' && typeof key === 'string') {
      if (typeof value === 'object' && value !== null) {
        return PROXY;
      }

      const fullPath = path
        .concat(key)
        // Remove array indexes
        .filter((part) => !/^\d+$/.test(part))
        .join('.');

      if (!readFieldsMap[fullPath]) {
        readFieldsMap[fullPath] = true;
        if (!isCheckedOnce) {
          clearTimeout(readTimeout);
          readTimeout = setTimeout(checkFields, timeout);
        }
      }
    }

    return DEFAULT;
  });
}
