#!/usr/bin/env node
/**
 * Creates or updates the shared Observe alert rule for the Hydrogen consent
 * synthetic checks: it fires when a check fails at least twice within two
 * run intervals (single flakes are ignored) and notifies the team's
 * "Developer Platforms - Synthetic Tests" notification policy, which posts to
 * #online-store-developer-platforms-operations.
 *
 * Requires OBSERVE_AUTH_TOKEN (see e2e/observe/upload.mjs).
 *
 * Usage: pnpm e2e:observe:alert-rule
 */

import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const repoRoot = resolve(fileURLToPath(import.meta.url), '../../..');
const metadataPath = resolve(repoRoot, 'e2e/observe/metadata.json');

const OBSERVE_API_ENDPOINT = 'https://shopify-monitoring.shopifycloud.com/query';

const VAULT_TEAM_ID = '13725';
const RULE_NAME = '[Hydrogen][Consent] Synthetic check failing';

/** "Developer Platforms - Synthetic Tests" (posts to the operations channel). */
const NOTIFICATION_POLICY_ID = '551bd483-59c2-4852-99b8-10127d028ce6';

const RULE_SUMMARY = '{{ labels.check_name }} is failing';
const RULE_MESSAGE =
  'The Hydrogen consent synthetic check {{ labels.check_name }} failed at least twice within two runs. ' +
  'View the failure: https://observe.shopify.io/a/observe/monitoring/synthetic/{{ labels.id }}';

/**
 * Fires when ≥2 runs of any hydrogen_consent_check-labeled check fail within
 * the window. With the 15-minute run interval from metadata.json this means
 * two failing runs in under 40 minutes — a single flaky run stays silent,
 * two consecutive failures page the operations channel.
 */
function ruleExpression(failureWindowInMinutes) {
  return (
    `sum by (check_name, id) (increase(shopify_observe_synthetic_check_run` +
    `{status="failure", hydrogen_consent_check="true", ` +
    `k8s_cluster=~"observability-apps-.*"}[${failureWindowInMinutes}m])) > 1`
  );
}

async function gql(query, variables) {
  const token = process.env.OBSERVE_AUTH_TOKEN;
  if (!token || !token.includes(':')) {
    console.error('❌ OBSERVE_AUTH_TOKEN is not set (see e2e/observe/upload.mjs).');
    process.exit(1);
  }

  const response = await fetch(OBSERVE_API_ENDPOINT, {
    method: 'POST',
    headers: {
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

async function main() {
  // The alert window scales with the checks' run interval so "two failures
  // within two runs" stays true if the interval is ever tuned.
  const runIntervalInMinutes = Math.max(
    ...JSON.parse(readFileSync(metadataPath, 'utf8')).map(
      (entry) => entry.runInterval,
    ),
  );
  const failureWindowInMinutes = runIntervalInMinutes * 2 + 10;

  const existing = await gql(
    'query ($filters: RuleConfigFilters!) { ruleConfigs(filters: $filters) { nodes { id name } } }',
    {filters: {vaultTeamIds: [VAULT_TEAM_ID], names: [RULE_NAME]}},
  );
  const match = existing.ruleConfigs.nodes.find((rule) => rule.name === RULE_NAME);

  const data = await gql(
    `mutation ($input: UpsertRuleConfigsInput!) {
      upsertRuleConfigs(input: $input) {
        ruleConfigs { id }
        validationErrors { fieldErrors { path message } }
      }
    }`,
    {
      input: {
        ruleConfigInputs: [
          {
            ...(match?.id ? {id: match.id} : {}),
            vaultTeamId: VAULT_TEAM_ID,
            name: RULE_NAME,
            dataSourceType: 'PROMQL',
            expression: ruleExpression(failureWindowInMinutes),
            for: 0,
            noData: 0,
            sustainType: 'for',
            summary: RULE_SUMMARY,
            message: RULE_MESSAGE,
            notificationPolicyId: NOTIFICATION_POLICY_ID,
          },
        ],
      },
    },
  );

  const result = data.upsertRuleConfigs;
  if (result.validationErrors?.length > 0) {
    throw new Error(`Validation errors: ${JSON.stringify(result.validationErrors)}`);
  }
  const id = result.ruleConfigs[0].id;
  console.log(
    `${match ? '↻ Updated' : '✚ Created'} "${RULE_NAME}" — ` +
      `https://observe.shopify.io/a/observe/monitoring/alertRules/${id}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
