import { createInterface } from "node:readline/promises";

export async function confirmCertificateInstallation(host: string): Promise<boolean> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) return false;

  const readline = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await readline.question(
      `To run HTTPS in development, Hydrogen needs to download mkcert, add a local certificate authority to your system trust store, and create a certificate for "${host}". Continue? [Y/n] `,
    );

    return acceptsCertificateInstallation(answer);
  } finally {
    readline.close();
  }
}

/** @internal Exported for tests. */
export function acceptsCertificateInstallation(answer: string): boolean {
  const response = answer.trim().toLowerCase();
  return response === "" || response === "y" || response === "yes";
}
