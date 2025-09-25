import {exec} from 'child_process';
import {promises as fs} from 'fs';
import {existsSync} from 'fs';
import {promisify} from 'util';
import path from 'path';

const execAsync = promisify(exec);

// Path to the secrets file - adjust based on where tests run from
const SECRETS_FILE = path.resolve(process.cwd(), 'secrets.ejson');
const PRIVATE_KEY_DIR = '/opt/ejson/keys';

export interface TestCredentials {
  email: string;
  password: string;
}

/**
 * Checks if the ejson private key is installed
 * @returns true if private key directory exists
 */
export async function hasPrivateKey(): Promise<boolean> {
  return existsSync(PRIVATE_KEY_DIR);
}

/**
 * Checks if the secrets file is currently encrypted
 * @returns true if encrypted, false if decrypted
 */
async function isEncrypted(): Promise<boolean> {
  try {
    const content = await fs.readFile(SECRETS_FILE, 'utf-8');
    const secrets = JSON.parse(content);
    // If any value starts with 'EJ[', it's encrypted
    return Object.values(secrets).some(
      (value) => typeof value === 'string' && value.startsWith('EJ['),
    );
  } catch (error) {
    return false;
  }
}

/**
 * Decrypts the secrets.ejson file in-place
 * @returns true if decryption succeeded, false otherwise
 */
export async function decryptSecrets(): Promise<boolean> {
  try {
    // Check if private key exists
    if (!(await hasPrivateKey())) {
      console.error('⚠️  Ejson private key not found in /opt/ejson/keys/');
      console.error(
        '   Run: ./scripts/setup-ejson-private-key.sh with the key in your clipboard',
      );
      return false;
    }

    // Check if secrets file exists
    if (!existsSync(SECRETS_FILE)) {
      console.error(`⚠️  Secrets file not found at ${SECRETS_FILE}`);
      return false;
    }

    // Check if already decrypted
    if (!(await isEncrypted())) {
      // Already decrypted, nothing to do
      return true;
    }

    // Decrypt the file in-place by capturing stdout and writing back
    // This matches the npm script behavior: ejson decrypt secrets.ejson
    const {stdout, stderr} = await execAsync(`ejson decrypt ${SECRETS_FILE}`);

    if (
      stderr &&
      stderr.length > 0 &&
      !stderr.includes('Decryption successful')
    ) {
      console.error('Decryption error:', stderr);
      return false;
    }

    // Write the decrypted content back to the file (in-place)
    await fs.writeFile(SECRETS_FILE, stdout);

    return true;
  } catch (error) {
    console.error('Failed to decrypt secrets:', error);
    return false;
  }
}

/**
 * Re-encrypts the secrets.ejson file after use
 * @returns true if encryption succeeded, false otherwise
 */
export async function encryptSecrets(): Promise<boolean> {
  try {
    // Check if secrets file exists
    if (!existsSync(SECRETS_FILE)) {
      console.error(`⚠️  Secrets file not found at ${SECRETS_FILE}`);
      return false;
    }

    // Check if already encrypted
    if (await isEncrypted()) {
      // Already encrypted, nothing to do
      return true;
    }

    // Encrypt the file in-place
    const {stdout, stderr} = await execAsync(`ejson encrypt ${SECRETS_FILE}`);

    if (stderr && !stderr.includes('Wrote')) {
      console.error('Encryption error:', stderr);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to encrypt secrets:', error);
    return false;
  }
}

/**
 * Gets test credentials from the decrypted secrets file
 * IMPORTANT: The secrets file must be decrypted first using decryptSecrets()
 * @returns Test credentials or null if not available
 */
export async function getTestCredentials(): Promise<TestCredentials | null> {
  try {
    // Read the decrypted file
    const content = await fs.readFile(SECRETS_FILE, 'utf-8');
    const secrets = JSON.parse(content);

    // Check if it's still encrypted
    if (await isEncrypted()) {
      console.error(
        '⚠️  Secrets file is still encrypted. Run decryptSecrets() first.',
      );
      return null;
    }

    // Extract email and password - never log these values
    const email = secrets.test_account_email;
    const password = secrets.test_account_password;

    if (!email || !password) {
      console.error('⚠️  Test credentials not found in secrets file');
      return null;
    }

    return {email, password};
  } catch (error) {
    console.error('Failed to read test credentials:', error);
    return null;
  }
}

/**
 * Utility function to safely use credentials in tests
 * Automatically handles decrypt/encrypt lifecycle
 * @param callback Function that uses the credentials
 * @returns Result of the callback or null if credentials unavailable
 */
export async function withTestCredentials<T>(
  callback: (credentials: TestCredentials) => Promise<T>,
): Promise<T | null> {
  let decrypted = false;

  try {
    // Decrypt secrets
    decrypted = await decryptSecrets();
    if (!decrypted) {
      console.error('Failed to decrypt secrets for test');
      return null;
    }

    // Get credentials
    const credentials = await getTestCredentials();
    if (!credentials) {
      console.error('Failed to get test credentials');
      return null;
    }

    // Use credentials
    return await callback(credentials);
  } finally {
    // Always re-encrypt if we decrypted
    if (decrypted) {
      await encryptSecrets();
    }
  }
}

/**
 * Ensures secrets file is encrypted (for use in cleanup/afterEach)
 */
export async function ensureSecretsEncrypted(): Promise<void> {
  try {
    const content = await fs.readFile(SECRETS_FILE, 'utf-8');
    const secrets = JSON.parse(content);

    // If no _public_key field, it's decrypted and needs encryption
    if (!secrets._public_key) {
      await encryptSecrets();
    }
  } catch (error) {
    // File might not exist or be invalid JSON - that's okay in cleanup
    console.warn('Could not check secrets encryption state:', error);
  }
}
