function deferPromise() {
  const deferred = { state: "pending" };
  deferred.promise = new Promise((resolve, reject) => {
    deferred.resolve = (value) => {
      if (deferred.state === "pending") deferred.state = "resolved";
      return resolve(value);
    };
    deferred.reject = (reason) => {
      if (deferred.state === "pending") deferred.state = "rejected";
      return reject(reason);
    };
  });
  return deferred;
}

export { deferPromise };
