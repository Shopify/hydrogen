export type CrossRuntimeResponse =
  | {
      headers: {
        append: (key: string, value: string) => void;
      };
    }
  | {
      appendHeader: (key: string, value: string | string[]) => void;
    };

export function appendHeader(
  response: CrossRuntimeResponse,
  header: string,
  value: string,
) {
  if (value) {
    if ('headers' in response) {
      response.headers.append(header, value);
    } else if ('appendHeader' in response) {
      response.appendHeader(header, value);
    } else {
      throw new Error('Unsupported response object');
    }
  }
}

export function appendHeaders(
  response: CrossRuntimeResponse,
  headers: [string, string[]][],
) {
  const append: ((key: string, value: string) => void) | undefined =
    'headers' in response
      ? (key, value) => response.headers.append(key, value)
      : 'appendHeader' in response
        ? (key, value) => response.appendHeader(key, value)
        : undefined;

  if (!append) {
    throw new Error('Unsupported response object');
  }

  for (const [header, values] of headers) {
    for (const value of values) {
      if (value) append(header, value);
    }
  }
}
