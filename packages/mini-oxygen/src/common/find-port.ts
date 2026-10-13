import getPort, {portNumbers} from 'get-port';

/**
 *
 * Finds an available port in the range of `portPreference` to `portPreference + range`.
 * Note: do not use this utility to find a port for MiniOxygen since that will be
 * handled by MiniOxygen itself. See https://github.com/Shopify/hydrogen/issues/1264
 */
export function findPort(portPreference: number, range = 100) {
  return getPort({
    port: portNumbers(portPreference, portPreference + range),
  });
}
