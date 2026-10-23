import {createRequire} from 'node:module';

const COMPATIBILITY_DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/;

function isCalendarDate(value: string) {
  if (!COMPATIBILITY_DATE_FORMAT.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

export const OXYGEN_COMPAT_PARAMS = {
  compatibilityFlags: [],
  compatibilityDate: '2025-04-01' as const,
};

/**
 * Picks the date the local runtime will run with: the requested date, unless
 * it's newer than the runtime supports or later than today (which Miniflare
 * rejects as a future date). Production keeps the requested date.
 */
export function capCompatibilityDate(
  requested: string,
  runtimeDate: string,
  today: string,
) {
  const newestAllowed = runtimeDate < today ? runtimeDate : today;
  return requested > newestAllowed ? newestAllowed : requested;
}

let runtimeCompatibilityDate: string | null | undefined;

/**
 * The newest compatibility date of the workerd binary that Miniflare runs.
 * Read from Miniflare's own `workerd` dependency so it always matches the
 * binary in use. Returns `null` if it can't be resolved.
 */
function getRuntimeCompatibilityDate() {
  if (runtimeCompatibilityDate === undefined) {
    try {
      const require = createRequire(import.meta.url);
      const requireFromMiniflare = createRequire(require.resolve('miniflare'));
      const {compatibilityDate} = requireFromMiniflare('workerd') as {
        compatibilityDate?: unknown;
      };

      runtimeCompatibilityDate =
        typeof compatibilityDate === 'string' &&
        isCalendarDate(compatibilityDate)
          ? compatibilityDate
          : null;
    } catch {
      runtimeCompatibilityDate = null;
    }
  }

  return runtimeCompatibilityDate;
}

const warnedCompatibilityDates = new Set<string>();

/**
 * Returns a compatibility date that the local runtime accepts. When the
 * requested date has to be lowered, warns once per requested date.
 */
export function toRuntimeCompatibilityDate(requested: string) {
  // Leave malformed dates for Miniflare to reject.
  if (!isCalendarDate(requested)) return requested;

  const today = new Date().toISOString().slice(0, 10);
  // If the runtime's date can't be read, only guard against future dates.
  // workerd then explains any date it doesn't support when it fails to start.
  const runtimeDate = getRuntimeCompatibilityDate() ?? today;
  const capped = capCompatibilityDate(requested, runtimeDate, today);

  if (capped !== requested && !warnedCompatibilityDates.has(requested)) {
    warnedCompatibilityDates.add(requested);
    console.warn(
      `MiniOxygen: compatibility date ${requested} isn't supported by the local Workers runtime yet. ` +
        `Running locally with ${capped} instead.` +
        (capped === runtimeDate
          ? ' Update @shopify/mini-oxygen to get a newer runtime.'
          : ''),
    );
  }

  return capped;
}
