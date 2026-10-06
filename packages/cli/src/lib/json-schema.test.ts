import {expect, it} from 'vitest';
import type {JsonOutputSchema} from '@shopify/cli-kit/node/json-output-schema';
import * as schemas0 from './authentication/types.js';
import * as schemas1 from './check/types.js';
import * as schemas2 from './maintenance/types.js';
import * as schemas3 from './setups/routes/types.js';
import * as schemas4 from './setups/types.js';
import * as schemas5 from './deployment/types.js';
import * as schemas6 from './storefronts/types.js';
import * as schemas7 from './codegen/types.js';
import * as schemas8 from './customer-account/types.js';
import * as schemas9 from './environments/types.js';
import * as schemas10 from './build-tooling/types.js';
import * as schemas11 from './onboarding/types.js';

const exports: unknown[] = [
  ...Object.values(schemas0),
  ...Object.values(schemas1),
  ...Object.values(schemas2),
  ...Object.values(schemas3),
  ...Object.values(schemas4),
  ...Object.values(schemas5),
  ...Object.values(schemas6),
  ...Object.values(schemas7),
  ...Object.values(schemas8),
  ...Object.values(schemas9),
  ...Object.values(schemas10),
  ...Object.values(schemas11),
];

const schemas = exports.filter(
  (value): value is JsonOutputSchema =>
    typeof value === 'object' && value !== null && 'jsonSchema' in value,
);

it.each(schemas)(
  '$name has no dangling JSON Schema references',
  ({jsonSchema}) => {
    JSON.stringify(jsonSchema, (_key, value) => {
      if (value && typeof value.$ref === 'string') {
        expect(value.$ref).toMatch(/^#\//);
        const target = value.$ref
          .slice(2)
          .split('/')
          .reduce(
            (node: Record<string, unknown> | undefined, key: string) =>
              node?.[key.replaceAll('~1', '/').replaceAll('~0', '~')],
            jsonSchema,
          );
        expect(target, `Unresolved reference: ${value.$ref}`).toBeDefined();
      }
      return value;
    });
  },
);
