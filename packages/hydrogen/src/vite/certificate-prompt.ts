import { createInterface } from "node:readline/promises";

export async function confirmCertificateInstallation(host: string): Promise<boolean> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) return false;

  const readline = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await readline.question(
      `Hydrogen needs to download mkcert, add a local certificate authority to your system trust store, and create a certificate for "${host}". Continue? [y/N] `,
    );

    return answer.trim().toLowerCase() === "y" || answer.trim().toLowerCase() === "yes";
  } finally {
    readline.close();
  }
}
