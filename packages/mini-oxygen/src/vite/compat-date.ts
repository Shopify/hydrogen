import {createRequire} from 'node:module';
import {resolve} from 'node:path';

const HYDROGEN_PACKAGE = '@shopify/hydrogen/package.json';
const HYDROGEN_FALLBACK_COMPATIBILITY_DATE = '2026-04-01';

type HydrogenPackageJson = {
  version?: unknown;
};

export function getCompatibilityDateFromHydrogenVersion(version: string) {
  const versionMatch = /^(\d{4})\.(\d{1,2})(?:[.-]|$)/.exec(version);
  if (!versionMatch) return HYDROGEN_FALLBACK_COMPATIBILITY_DATE;

  const month = Number(versionMatch[2]);
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return HYDROGEN_FALLBACK_COMPATIBILITY_DATE;
  }

  return `${versionMatch[1]}-${String(month).padStart(2, '0')}-01`;
}

export function getHydrogenCompatibilityDate(root = process.cwd()) {
  try {
    const hydrogenPackageJson = createRequire(resolve(root, 'package.json'))(
      HYDROGEN_PACKAGE,
    ) as HydrogenPackageJson;

    return typeof hydrogenPackageJson.version === 'string'
      ? getCompatibilityDateFromHydrogenVersion(hydrogenPackageJson.version)
      : undefined;
  } catch {
    return undefined;
  }
}
