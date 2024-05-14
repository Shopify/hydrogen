/**
 * Creates a promise that can be resolved or rejected from the outter scope.
 */
export function deferPromise() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let resolve = (value?: unknown) => {};
  let reject = resolve;

  const promise = new Promise((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });

  return {promise, resolve, reject};
}
