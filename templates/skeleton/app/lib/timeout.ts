const defaultNetworkTimeoutTime = 5000; // ms

export type PromiseWithTimeoutProps<T> = {
  promise: Promise<T>;
  timeout?: number;
  errorCallback?: (error: string) => void;
};

export const promiseWithTimeout = <T>({
  promise,
  timeout = defaultNetworkTimeoutTime,
  errorCallback,
}: PromiseWithTimeoutProps<T>): Promise<T> => {
  let timer: NodeJS.Timeout;

  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      timer = setTimeout(() => {
        console.log('a');
        reject(new Error('Request timed out'));
      }, timeout);
    }),
  ])
    .then((data) => {
      console.log('b');
      clearTimeout(timer);
      return data;
    })
    .catch((error) => {
      console.log('c');
      clearTimeout(timer);
      errorCallback && errorCallback(error);
      return new Promise<T>((_, reject) => reject(error));
    });
};
