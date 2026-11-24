export const ROLLOUTS_ASSIGN_API_VERSION = 'unstable';
export const ROLLOUTS_ASSIGN_TIMEOUT_IN_MS = 1000;
export const ROLLOUTS_ASSIGN_MUTATION = `mutation RolloutsAssign {
  rolloutsAssign {
    userErrors {
      code
      field
      message
    }
  }
}`;

const SHOPIFY_ESSENTIAL_COOKIE = '_shopify_essential';
const rolloutsAssigners = new WeakMap<object, () => Promise<void>>();

export function setRolloutsAssigner(
  storefront: object,
  assign: () => Promise<void>,
) {
  rolloutsAssigners.set(storefront, assign);
}

export function assignRollouts(storefront: object): Promise<void> {
  return rolloutsAssigners.get(storefront)?.() ?? Promise.resolve();
}

export function replaceEssentialCookie(
  cookieHeader: string,
  setCookies: string[],
): string | undefined {
  const prefix = `${SHOPIFY_ESSENTIAL_COOKIE}=`;
  const essential = setCookies
    .map((setCookie) => setCookie.split(';', 1)[0].trim())
    .find((pair) => pair.startsWith(prefix) && pair.length > prefix.length);
  if (!essential) return undefined;

  const others = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part && !part.startsWith(prefix));
  return [...others, essential].join('; ');
}
