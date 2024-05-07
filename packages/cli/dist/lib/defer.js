function deferPromise() {
  let resolve = (value) => {
  };
  let reject = resolve;
  const promise = new Promise((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });
  return { promise, resolve, reject };
}

export { deferPromise };
