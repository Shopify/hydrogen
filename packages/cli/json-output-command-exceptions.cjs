// Exact repository-relative command paths exempt from the typed JSON output rule.
const commandExceptions = [
  // Existing finite commands awaiting migration. Remove entries as they adopt typed JSON output.
  // Do not add new finite commands to this section.
  'packages/cli/src/commands/hydrogen/setup.ts',
  'packages/cli/src/commands/hydrogen/setup/css.ts',
  'packages/cli/src/commands/hydrogen/setup/markets.ts',
  'packages/cli/src/commands/hydrogen/setup/vite.ts',
  'packages/cli/src/commands/hydrogen/shortcut.ts',
  'packages/cli/src/commands/hydrogen/upgrade.ts',

  // Streaming commands without a single finite result.
  'packages/cli/src/commands/hydrogen/debug/cpu.ts',
  'packages/cli/src/commands/hydrogen/dev.ts',
  'packages/cli/src/commands/hydrogen/preview.ts',
];

module.exports = {commandExceptions};
