/**
 * Creates a promise that can be resolved or rejected from the outter scope.
 */
export function deferPromise<T = unknown>() {
  const deferred = {state: 'pending'} as {
    promise: Promise<unknown>;
    resolve: (value?: T) => void;
    reject: (reason?: any) => void;
    state: 'pending' | 'resolved' | 'rejected';
  };

  deferred.promise = new Promise((resolve, reject) => {
    deferred.resolve = (value) => {
      if (deferred.state === 'pending') deferred.state = 'resolved';
      return resolve(value);
    };

    deferred.reject = (reason) => {
      if (deferred.state === 'pending') deferred.state = 'rejected';
      return reject(reason);
    };
  });

  return deferred;
}

export type DeferredPromise<T = unknown> = ReturnType<typeof deferPromise<T>>;
