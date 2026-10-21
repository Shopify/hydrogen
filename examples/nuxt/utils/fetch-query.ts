export function toFetchQuery(search: string): Record<string, string | string[]> | undefined {
  const query = search.startsWith("?") ? search.slice(1) : search;
  if (!query) return undefined;

  const result: Record<string, string | string[]> = {};
  for (const [key, value] of new URLSearchParams(query)) {
    const current = result[key];
    if (current == null) {
      result[key] = value;
    } else if (Array.isArray(current)) {
      current.push(value);
    } else {
      result[key] = [current, value];
    }
  }

  return result;
}
