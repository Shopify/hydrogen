import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import {execSync} from 'child_process';
import {homedir} from 'os';
import colors from '@shopify/cli-kit/node/colors';
import {
  outputContent,
  outputToken,
  outputInfo,
} from '@shopify/cli-kit/node/output';
import {renderInfo} from '@shopify/cli-kit/node/ui';
import {fileExists, mkdir} from '@shopify/cli-kit/node/fs';
import {AbortError} from '@shopify/cli-kit/node/error';

export interface CertificateOptions {
  certPath?: string;
  keyPath?: string;
  port?: number;
}

/**
 * Check if mkcert is installed on the system
 */
export function isMkcertInstalled(): boolean {
  try {
    execSync('mkcert -version', {stdio: 'ignore'});
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Install mkcert on the system
 */
export async function installMkcert() {
  outputInfo('\nInstalling mkcert...\n');

  try {
    // Check platform and install accordingly
    const platform = process.platform;
    if (platform === 'darwin') {
      execSync('brew install mkcert nss', {stdio: 'inherit'});
    } else if (platform === 'linux') {
      execSync('sudo apt-get install -y mkcert libnss3-tools', {
        stdio: 'inherit',
      });
    } else if (platform === 'win32') {
      execSync('choco install mkcert', {stdio: 'inherit'});
    } else {
      throw new Error(`Unsupported platform: ${platform}`);
    }

    return true;
  } catch (error) {
    renderInfo({
      headline: 'Unable to automatically install mkcert',
      body: [
        'Please install mkcert manually:',
        '- macOS: brew install mkcert nss',
        '- Linux: sudo apt-get install -y mkcert libnss3-tools',
        '- Windows: choco install mkcert',
        '\nVisit https://github.com/FiloSottile/mkcert for more information.',
      ],
    });
    return false;
  }
}

/**
 * Generate self-signed certificates for local HTTPS
 */
export async function generateCertificate(options: CertificateOptions = {}) {
  const hydrogenDir = path.join(homedir(), '.hydrogen');
  const certsDir = path.join(hydrogenDir, 'certs');

  // Ensure the certs directory exists
  if (!(await fileExists(certsDir))) {
    await mkdir(certsDir);
  }

  // Default paths for certificates
  const keyPath = options.keyPath || path.join(certsDir, 'localhost-key.pem');
  const certPath = options.certPath || path.join(certsDir, 'localhost.pem');

  // Check if the certificates already exist
  const keyExists = await fileExists(keyPath);
  const certExists = await fileExists(certPath);

  // If certificates already exist, return them
  if (keyExists && certExists) {
    outputInfo('Using existing certificates for HTTPS');
    return {
      key: fs.readFileSync(keyPath, 'utf-8'),
      cert: fs.readFileSync(certPath, 'utf-8'),
      keyPath,
      certPath,
    };
  }

  // Check if mkcert is installed
  if (!isMkcertInstalled()) {
    const installed = await installMkcert();
    if (!installed) {
      throw new AbortError(
        'Unable to generate self-signed certificates',
        'Please install mkcert manually and try again.',
      );
    }
  }

  // Generate certificates
  outputInfo('\nGenerating self-signed certificates for HTTPS...\n');

  try {
    // Create a CA
    execSync('mkcert -install', {stdio: 'inherit'});

    // Generate certificate for localhost
    execSync(
      `mkcert -key-file "${keyPath}" -cert-file "${certPath}" localhost 127.0.0.1 ::1`,
      {
        stdio: 'inherit',
      },
    );

    renderInfo({
      headline: 'Self-signed certificates generated successfully',
      body: [
        outputContent`Certificates stored in ${colors.green(certPath)} and ${colors.green(
          keyPath,
        )}`.value,
      ],
    });

    return {
      key: fs.readFileSync(keyPath, 'utf-8'),
      cert: fs.readFileSync(certPath, 'utf-8'),
      keyPath,
      certPath,
    };
  } catch (error) {
    throw new AbortError(
      'Failed to generate self-signed certificates',
      'Please ensure mkcert is installed and try again.',
    );
  }
}

/**
 * Configure HTTPS server options for Vite
 */
export async function configureHttpsServer(
  useLocalhost: boolean,
  localhostPort?: number,
): Promise<{https: any; port: number} | undefined> {
  if (!useLocalhost) return undefined;

  // Generate certificates
  const {key, cert} = await generateCertificate();

  return {
    https: {
      key,
      cert,
    },
    port: localhostPort || 3000,
  };
}
