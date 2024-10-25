// This cannot use LIB_VERSION as it changes when deploy on next tag
const COMPAT_DATE = '2024-10-01'
export function getCompatDate() {
  // E.g. '2024-07-01'
  return COMPAT_DATE;
}
