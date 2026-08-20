#!/usr/bin/env node

import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { installLocalHttpsCertificates } from "./certs";
import { checkGraphQL } from "./gql";
import { setupHydrogen } from "./setup";

const CLI_ARGUMENTS_INDEX = 2;
const FAILURE_EXIT_CODE = 1;

const COMMANDS = [
  { path: ["certs", "install"], run: async (_args: string[]) => installLocalHttpsCertificates() },
  { path: ["setup"], run: async (_args: string[]) => setupHydrogen() },
  { path: ["gql", "check"], run: async (args: string[]) => checkGraphQL({ args }) },
] as const;

function commandMatches(path: readonly string[], args: string[]): boolean {
  return path.every((segment, index) => args[index] === segment);
}

export function runCli(): void {
  const args = process.argv.slice(CLI_ARGUMENTS_INDEX);
  const command = COMMANDS.find(({ path }) => commandMatches(path, args));

  if (!command) {
    const commandName = args.join(" ");
    const availableCommands = COMMANDS.map(({ path }) => path.join(" ")).join(", ");
    console.error(commandName ? `Unknown command: ${commandName}` : "No command specified.");
    console.error(`Available commands: ${availableCommands}`);
    process.exit(FAILURE_EXIT_CODE);
  }

  command.run(args.slice(command.path.length)).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "An unexpected error occurred");
    process.exit(FAILURE_EXIT_CODE);
  });
}

const isDirectExecution =
  process.argv[1] !== undefined && fileURLToPath(import.meta.url) === realpathSync(process.argv[1]);

if (isDirectExecution) {
  runCli();
}
