type QueryKey = string | readonly unknown[];

export function hashKey(queryKey: QueryKey): string {
  const rawKeys = Array.isArray(queryKey) ? queryKey : [queryKey];
  let hash = '';

  // Keys could be in the following shape:
  //
  // From `storefront.query`:
  // ['api-endpoint', 'method', 'headers', 'query']
  //
  // From `createWithCache`:
  // ['string', {}, 1, []]
  for (const key of rawKeys) {
    if (key != null) {
      if (typeof key === 'object') {
        hash += JSON.stringify(key);
      } else {
        hash += key.toString();
      }
    }
  }

  return encodeURIComponent(hash);
}
