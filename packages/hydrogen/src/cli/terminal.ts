import { createInterface } from "node:readline/promises";

export function canPromptInTerminal(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY) && !env.CI;
}

export async function confirmInTerminal(question: string): Promise<boolean> {
  const readline = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (await readline.question(`${question} [Y/n] `)).trim().toLowerCase();
    return answer === "" || answer === "y" || answer === "yes";
  } finally {
    readline.close();
  }
}
