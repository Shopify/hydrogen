#!/usr/bin/env node
/**
 * Uploads the Observe bundles built by e2e/observe/build.mjs as Observe
 * Synthetic Checks (https://observe.shopify.io/a/observe/monitoring/synthetic),
 * creating or updating them via the Observe GraphQL API.
 *
 * Requires:
 * - OBSERVE_AUTH_TOKEN: basic-auth credentials (username:password) for the
 *   Observe API. Obtain them from the "E2E - Admin Web" 1Password vault, the
 *   same credentials `dev e2e sync-to-observe` uses in admin-web.
 * - Bundles already built: pnpm e2e:observe:build
 *
 * Checks are created disabled (team convention): verify the first runs in
 * Observe, then enable them from the check page. Failures alert through the
 * shared rule created by e2e/observe/alert-rule.mjs, not per-check rules.
 *
 * Usage: pnpm e2e:observe:upload [--only <substring>]
 */

import {readFileSync} from 'node:fs';
import {basename, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const repoRoot = resolve(fileURLToPath(import.meta.url), '../../..');
const metadataPath = resolve(repoRoot, 'e2e/observe/metadata.json');
const distDir = resolve(repoRoot, 'e2e/observe/dist');

const OBSERVE_API_ENDPOINT = 'https://shopify-monitoring.shopifycloud.com/query';

/** Online Store Developer Platforms (vault team). */
const VAULT_TEAM_ID = '13725';
const SERVICE_ID = 'web';
const DATACENTERS = 'us-east1';

/** Labels consumed by the shared failure alert rule (alert-rule.mjs). */
const ADDITIONAL_METRIC_LABELS = (name) => [
  {name: 'check_name', value: name},
  {name: 'hydrogen_consent_check', value: 'true'},
];

async function gql(query, variables) {
  const token = process.env.OBSERVE_AUTH_TOKEN;
  if (!token || !token.includes(':')) {
    console.error(
      '❌ OBSERVE_AUTH_TOKEN is not set (expected username:password, see ' +
        'the "E2E - Admin Web" 1Password vault).',
    );
    process.exit(1);
  }

  const response = await fetch(OBSERVE_API_ENDPOINT, {
    method: 'POST',
    headers: {
      // The token is already username:password; the API expects it base64
      // encoded as a standard basic-auth header value.
      Authorization: `Basic ${Buffer.from(token).toString('base64')}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({query, variables}),
  });
  if (!response.ok) {
    throw new Error(`Observe API responded ${response.status} ${response.statusText}`);
  }
  const result = await response.json();
  if (result.errors) {
    throw new Error(`Observe GraphQL errors: ${JSON.stringify(result.errors)}`);
  }
  return result.data;
}

async function findCheckIdByName(name) {
  const data = await gql(
    'query ($names: [String!]!) { syntheticChecks(filters: {names: $names}) { nodes { id name enabled } } }',
    {names: [name]},
  );
  return data.syntheticChecks.nodes.find((check) => check.name === name) ?? null;
}

async function upsertCheck(entry, testCode, existing) {
  const data = await gql(
    `mutation ($input: UpsertSyntheticChecksInput!) {
      upsertSyntheticChecks(input: $input) {
        syntheticChecks { id }
        validationErrors { fieldErrors { path message } }
      }
    }`,
    {
      input: {
        syntheticCheckInputs: [
          {
            ...(existing?.id ? {id: existing.id} : {}),
            name: entry.name,
            vaultTeamId: VAULT_TEAM_ID,
            checkType: 'playwright',
            runInterval: entry.runInterval,
            testCode,
            enabled: existing?.enabled ?? false,
            datacenters: DATACENTERS,
            serviceId: SERVICE_ID,
            additionalMetricLabels: ADDITIONAL_METRIC_LABELS(entry.name),
            // Failures alert through the shared rule (alert-rule.mjs).
            ruleEnabled: false,
          },
        ],
      },
    },
  );

  const result = data.upsertSyntheticChecks;
  if (result.validationErrors?.length > 0) {
    throw new Error(
      `Validation errors for ${entry.name}: ${JSON.stringify(result.validationErrors)}`,
    );
  }
  return result.syntheticChecks[0].id;
}

async function main() {
  const only = process.argv.includes('--only')
    ? process.argv[process.argv.indexOf('--only') + 1]
    : undefined;

  const metadata = JSON.parse(readFileSync(metadataPath, 'utf8'));
  const entries = only
    ? metadata.filter((entry) => entry.file.includes(only))
    : metadata;
  if (entries.length === 0) {
    console.error(`❌ No metadata entries${only ? ` matching "${only}"` : ''}.`);
    process.exit(1);
  }

  for (const entry of entries) {
    const bundlePath = resolve(distDir, `${basename(entry.file, '.ts')}.mjs`);
    const testCode = readFileSync(bundlePath, 'utf8');

    const existing = await findCheckIdByName(entry.name);
    const id = await upsertCheck(entry, testCode, existing);
    console.log(
      `${existing ? '↻ Updated' : '✚ Created'} ${entry.name} — ` +
        `https://observe.shopify.io/a/observe/monitoring/synthetic/${id}`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
