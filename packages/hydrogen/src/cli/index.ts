#!/usr/bin/env node

import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { setupHydrogen } from "./setup";

const COMMANDS = {
  setup: async () => setupHydrogen(),
} satisfies Record<string, () => Promise<void>>;

type CommandName = keyof typeof COMMANDS;

function isCommandName(value: string): value is CommandName {
  return value in COMMANDS;
}

function runCli(): void {
  const commandName = process.argv[2];

  if (!commandName || !isCommandName(commandName)) {
    const availableCommands = Object.keys(COMMANDS).join(", ");
    console.error(commandName ? `Unknown command: ${commandName}` : "No command specified.");
    console.error(`Available commands: ${availableCommands}`);
    process.exit(1);
  }

  COMMANDS[commandName]().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "An unexpected error occurred");
    process.exit(1);
  });
}

const isDirectExecution =
  process.argv[1] !== undefined && fileURLToPath(import.meta.url) === realpathSync(process.argv[1]);

if (isDirectExecution) {
  runCli();
}
