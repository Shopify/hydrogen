import getPort, { portNumbers } from 'get-port';

function findPort(portPreference, range = 100) {
  return getPort({
    port: portNumbers(portPreference, portPreference + range)
  });
}

export { findPort };
