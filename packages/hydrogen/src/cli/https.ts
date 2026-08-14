import { provisionLocalHttps } from "../vite";

export async function setupLocalHttps(): Promise<void> {
  const { host, certPath, keyPath } = await provisionLocalHttps();

  console.log(`Local HTTPS is ready for https://${host}`);
  console.log(`  Certificate: ${certPath}`);
  console.log(`  Private key: ${keyPath}`);
}
