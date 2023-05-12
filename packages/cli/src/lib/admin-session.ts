import {AbortError} from '@shopify/cli-kit/node/error';
import {ensureAuthenticatedAdmin} from '@shopify/cli-kit/node/session';
import type {AdminSession} from '@shopify/cli-kit/node/session';

export async function getAdminSession(shop: string): Promise<AdminSession> {
  let adminSession;
  try {
    adminSession = await ensureAuthenticatedAdmin(shop);
  } catch {
    throw new AbortError('Unable to authenticate with Shopify', undefined, [
      `Ensure the shop that you specified is correct (you are trying to use: ${shop})`,
    ]);
  }

  return adminSession;
}
