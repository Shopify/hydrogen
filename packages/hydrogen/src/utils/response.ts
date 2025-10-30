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
  if ('headers' in response) {
    response.headers.append(header, value);
  } else if ('appendHeader' in response) {
    response.appendHeader(header, value);
  } else {
    throw new Error('Unsupported response object');
  }
}
