import { AbortError } from '@shopify/cli-kit/node/error';

const GID_REGEXP = /gid:\/\/shopify\/\w*\/(\d+)/;
function parseGid(gid) {
  const matches = GID_REGEXP.exec(gid);
  if (matches && matches[1] !== void 0) {
    return matches[1];
  }
  throw new AbortError(`Invalid Global ID: ${gid}`);
}

export { parseGid };
