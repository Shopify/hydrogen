import getPort, {portNumbers} from 'get-port';

export function findPort(portPreference: number, range = 100) {
  return getPort({
    port: portNumbers(portPreference, portPreference + range),
  });
}
