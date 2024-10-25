import {LIB_VERSION} from '../version.js';

export function getCompatDate() {
  const [compatDate] = new Date(LIB_VERSION.replace(/\.\d+$/, '') + ' UTC')
    .toISOString()
    .split('T');

  // E.g. '2024-10-01'
  return compatDate;
}
