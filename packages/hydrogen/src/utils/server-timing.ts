function buildServerTimingHeader(values: Record<string, string | undefined>) {
  return Object.entries(values)
    .map(([key, value]) => (value ? `${key};desc=${value}` : undefined))
    .filter(Boolean)
    .join(', ');
}

/**
 * Creates a Server-Timing header from the given values and appends it to the response.
 */
export function appendServerTimingHeader(
  response: {headers: Headers},
  values: string | Parameters<typeof buildServerTimingHeader>[0],
) {
  const header =
    typeof values === 'string' ? values : buildServerTimingHeader(values);

  if (header) {
    response.headers.append('Server-Timing', header);
  }
}
