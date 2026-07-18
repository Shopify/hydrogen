/** Convert URLSearchParams to TanStack Router's string/repeated-string search shape. */
export function searchParamsToRecord(
  searchParams: URLSearchParams,
): Record<string, string | string[]> {
  const search = Object.create(null) as Record<string, string | string[]>;

  searchParams.forEach((value, key) => {
    const current = search[key];
    if (current === undefined) {
      search[key] = value;
    } else if (Array.isArray(current)) {
      current.push(value);
    } else {
      search[key] = [current, value];
    }
  });

  return search;
}
