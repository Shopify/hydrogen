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

// In order: unique token, visit token, and consent
const trackedTimings = ['_y', '_s', '_cmp'] as const;

type TrackedTimingKeys = (typeof trackedTimings)[number];
export type TrackedTimingsRecord = Partial<Record<TrackedTimingKeys, string>>;

export function extractServerTimingHeader(
  serverTimingHeader?: string,
): TrackedTimingsRecord {
  const values: TrackedTimingsRecord = {};
  if (!serverTimingHeader) return values;

  const re = new RegExp(
    `\\b(${trackedTimings.join('|')});desc="?([^",]+)"?`,
    'g',
  );

  let match;
  while ((match = re.exec(serverTimingHeader)) !== null) {
    values[match[1] as TrackedTimingKeys] = match[2];
  }

  return values;
}
