// Exact repository-relative command paths exempt from the typed JSON output rule.
const commandExceptions = [
  // Existing finite commands awaiting migration. Remove entries as they adopt typed JSON output.
  // Do not add new finite commands to this section.
  'packages/cli/src/commands/hydrogen/build.ts',
  'packages/cli/src/commands/hydrogen/check.ts',
  'packages/cli/src/commands/hydrogen/codegen.ts',
  'packages/cli/src/commands/hydrogen/customer-account-push.ts',
  'packages/cli/src/commands/hydrogen/deploy.ts',
  'packages/cli/src/commands/hydrogen/env/list.ts',
  'packages/cli/src/commands/hydrogen/env/pull.ts',
  'packages/cli/src/commands/hydrogen/env/push.ts',
  'packages/cli/src/commands/hydrogen/g.ts',
  'packages/cli/src/commands/hydrogen/generate/route.ts',
  'packages/cli/src/commands/hydrogen/generate/routes.ts',
  'packages/cli/src/commands/hydrogen/init.ts',
  'packages/cli/src/commands/hydrogen/link.ts',
  'packages/cli/src/commands/hydrogen/list.ts',
  'packages/cli/src/commands/hydrogen/login.ts',
  'packages/cli/src/commands/hydrogen/logout.ts',
  'packages/cli/src/commands/hydrogen/setup.ts',
  'packages/cli/src/commands/hydrogen/setup/css.ts',
  'packages/cli/src/commands/hydrogen/setup/markets.ts',
  'packages/cli/src/commands/hydrogen/setup/vite.ts',
  'packages/cli/src/commands/hydrogen/shortcut.ts',
  'packages/cli/src/commands/hydrogen/unlink.ts',
  'packages/cli/src/commands/hydrogen/upgrade.ts',

  // Streaming commands without a single finite result.
  'packages/cli/src/commands/hydrogen/debug/cpu.ts',
  'packages/cli/src/commands/hydrogen/dev.ts',
  'packages/cli/src/commands/hydrogen/preview.ts',
];

module.exports = {commandExceptions};
