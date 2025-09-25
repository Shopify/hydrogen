import {test, expect} from '@playwright/test';
import {
  decryptSecrets,
  encryptSecrets,
  getTestCredentials,
} from '../helpers/ejson-secrets';
import {existsSync} from 'fs';

test.describe('ejson secrets helper', () => {
  test('should decrypt secrets.ejson and extract credentials', async () => {
    // Check if private key exists
    const privateKeyPath = '/opt/ejson/keys';
    if (!existsSync(privateKeyPath)) {
      test.skip(
        true,
        'Ejson private key not installed. Run ./scripts/setup-ejson-private-key.sh',
      );
      return;
    }

    // Test decryption
    const decrypted = await decryptSecrets();
    expect(decrypted).toBe(true);

    // Test credential extraction
    const credentials = await getTestCredentials();
    expect(credentials).toHaveProperty('email');
    expect(credentials).toHaveProperty('password');
    expect(credentials.email).toBeTruthy();
    expect(credentials.password).toBeTruthy();

    // Never log the actual values - just verify they exist
    expect(typeof credentials.email).toBe('string');
    expect(typeof credentials.password).toBe('string');

    // Test re-encryption
    const encrypted = await encryptSecrets();
    expect(encrypted).toBe(true);
  });

  test('should handle missing private key gracefully', async () => {
    // This test simulates missing private key scenario
    // The helper should return false when key is missing
    const result = await decryptSecrets();

    // If we have a key, skip this test
    if (result === true) {
      test.skip(true, 'Private key exists, cannot test missing key scenario');
      return;
    }

    expect(result).toBe(false);
  });
});
