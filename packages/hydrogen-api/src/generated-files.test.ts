import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';
import {describe, it, expect} from 'vitest';
import {SF_API_VERSION, CA_API_VERSION} from './api-versions';

const here = dirname(fileURLToPath(import.meta.url));

// codegen.ts emits a header comment on line 3 of each generated .d.ts
// like `* Based on Storefront API 2026-04`. If that version doesn't
// match what api-versions.ts declares, someone bumped the constant
// without running `pnpm graphql-types`.
const cases = [
  {
    file: 'generated/storefront-api-types.d.ts',
    apiName: 'Storefront',
    declaredVersion: SF_API_VERSION,
  },
  {
    file: 'generated/customer-account-api-types.d.ts',
    apiName: 'Customer Account',
    declaredVersion: CA_API_VERSION,
  },
] as const;

describe('checked-in generated types', () => {
  it.each(cases)(
    '$file matches declared $apiName API version ($declaredVersion)',
    ({file, apiName, declaredVersion}) => {
      const contents = readFileSync(join(here, file), 'utf8');
      const match = contents.match(
        new RegExp(`Based on ${apiName} API (\\S+)`),
      );
      expect(
        match,
        `"Based on ${apiName} API <version>" header not found in ${file}. Run \`pnpm graphql-types\` to regenerate.`,
      ).not.toBeNull();
      const [, generatedVersion] = match!;
      expect(
        generatedVersion,
        `${file} is stale: generated against ${apiName} API ${generatedVersion}, but api-versions.ts declares ${declaredVersion}. Run \`pnpm graphql-types\` to regenerate.`,
      ).toBe(declaredVersion);
    },
  );
});
