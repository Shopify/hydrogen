import { rm } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

import { LOCAL_HTTPS_DEFAULTS, provisionLocalHttps } from "../vite";
import { uninstallCertificateAuthority } from "../vite/mkcert";

const REMOVE_CA_FLAG = "--remove-ca";

export async function installLocalHttpsCertificates(): Promise<void> {
  const { host, certPath, keyPath } = await provisionLocalHttps();

  console.log(`Local HTTPS is ready for https://${host}`);
  console.log(`  Certificate: ${certPath}`);
  console.log(`  Private key: ${keyPath}`);
}

export async function uninstallLocalHttpsCertificates(args: string[] = []): Promise<void> {
  const unknownArgument = args.find((argument) => argument !== REMOVE_CA_FLAG);
  if (unknownArgument) {
    throw new Error(`Unknown argument: ${unknownArgument}`);
  }

  const removeCertificateAuthority = args.includes(REMOVE_CA_FLAG);
  if (removeCertificateAuthority) {
    console.warn(
      "Warning: removing mkcert's shared local CA will make certificates created by other projects untrusted.",
    );
    await uninstallCertificateAuthority();
  }

  const hydrogenDirectory = join(homedir(), ".shopify", "hydrogen");
  const certificateDirectory = join(hydrogenDirectory, "certs");
  const host = LOCAL_HTTPS_DEFAULTS.host;
  await Promise.all([
    rm(join(certificateDirectory, `${host}.pem`), { force: true }),
    rm(join(certificateDirectory, `${host}-key.pem`), { force: true }),
    rm(join(hydrogenDirectory, "mkcert"), { recursive: true, force: true }),
  ]);

  console.log("Hydrogen's local HTTPS certificate files were removed.");
  if (!removeCertificateAuthority) {
    console.log(`The shared mkcert CA remains trusted. Pass ${REMOVE_CA_FLAG} to remove it.`);
  }
}
