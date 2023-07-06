import type {Wallet} from '@shopify/connect-wallet';
import {createCookieSessionStorage} from '@shopify/remix-oxygen';

// We recommend creating a secret value to encrypt your cookies with.
// Doing that would look like this:
// const sessionSecret = process.env.SESSION_SECRET ?? 'DEFAULT_SECRET';

const walletStorage = createCookieSessionStorage({
  cookie: {
    name: 'wallet_cookie',
    secure: true,
    secrets: ['DEFAULT_SECRET'],
    sameSite: 'lax',
    path: '/',
    httpOnly: true,
  },
});

/**
 * Validate that all required fields for running verifyMessage are present.
 * This means the inclusion of: address, message, and signature.
 *
 * [`verifyMessage` documentation](https://viem.sh/docs/utilities/verifyMessage.html)
 */
export function isWallet(value: unknown): value is Wallet {
  return (
    typeof value === 'object' &&
    value !== null &&
    'address' in value &&
    'message' in value &&
    'signature' in value
  );
}

export async function walletSession(request: Request) {
  const session = await walletStorage.getSession(request.headers.get('Cookie'));

  return {
    clear: () => session.unset('wallet'),
    commit: () => walletStorage.commitSession(session),
    getWallet: () => {
      const walletCookie = session.get('wallet');
      return isWallet(walletCookie) ? walletCookie : undefined;
    },
    setWallet: (wallet: Wallet | undefined) => session.set('wallet', wallet),
  };
}
