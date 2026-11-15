import {describe, expect, it} from 'vitest';
import {capCompatibilityDate, toRuntimeCompatibilityDate} from './compat.js';

describe('capCompatibilityDate', () => {
  const runtimeDate = '2026-07-30';
  const today = '2026-10-22';

  it('keeps dates the runtime supports', () => {
    expect(capCompatibilityDate('2026-04-01', runtimeDate, today)).toBe(
      '2026-04-01',
    );
    expect(capCompatibilityDate(runtimeDate, runtimeDate, today)).toBe(
      runtimeDate,
    );
  });

  it('lowers dates newer than the runtime supports to the runtime date', () => {
    expect(capCompatibilityDate('2026-10-01', runtimeDate, today)).toBe(
      runtimeDate,
    );
  });

  it('lowers future dates to today when the runtime is newer than today', () => {
    expect(capCompatibilityDate('2027-01-01', '2026-12-15', today)).toBe(
      today,
    );
  });
});

describe('toRuntimeCompatibilityDate', () => {
  it('leaves malformed dates for Miniflare to reject', () => {
    expect(toRuntimeCompatibilityDate('not-a-date')).toBe('not-a-date');
    expect(toRuntimeCompatibilityDate('2026-99-99')).toBe('2026-99-99');
    expect(toRuntimeCompatibilityDate('2026-02-30')).toBe('2026-02-30');
  });
});
