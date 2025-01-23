// This cannot use LIB_VERSION as it changes when deploy on next tag
const COMPAT_DATE = '2025-01-01';
export function getCompatDate() {
  return COMPAT_DATE;
}
