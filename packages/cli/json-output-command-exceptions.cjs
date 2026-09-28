// Exact repository-relative command paths exempt from the typed JSON output rule.
const commandExceptions = [
  // Streaming commands without a single finite result.
  'packages/cli/src/commands/hydrogen/debug/cpu.ts',
  'packages/cli/src/commands/hydrogen/dev.ts',
  'packages/cli/src/commands/hydrogen/preview.ts',
];

module.exports = {commandExceptions};
