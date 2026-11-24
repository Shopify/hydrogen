import type { StorefrontClient } from "../../client";
import { withoutStorefrontHeaderCapture, withStorefrontApiVersion } from "../../client/client";
import { getLogger } from "../logging";
import { parseCookieHeader, SHOPIFY_ESSENTIAL_COOKIE } from "../request-context";
import { isObjectRecord } from "../utils/record";

const ROLLOUTS_ASSIGN_API_VERSION = "unstable";
const ROLLOUTS_ASSIGN_TIMEOUT_IN_MS = 1_000;
const ROLLOUTS_ASSIGN_MUTATION: string = `
  mutation RolloutsAssign {
    rolloutsAssign {
      userErrors {
        code
        field
        message
      }
    }
  }
`;

const log = getLogger("cart-api");

export type RolloutsAssignment = {
  setCookies: string[];
  cookie?: string;
};

export async function assignRollouts(
  storefrontClient: StorefrontClient,
): Promise<RolloutsAssignment> {
  const { cookie } = storefrontClient.requestContext;
  if (
    storefrontClient.type !== "private" ||
    !parseCookieHeader(cookie).has(SHOPIFY_ESSENTIAL_COOKIE)
  ) {
    return { setCookies: [] };
  }

  try {
    const result = await storefrontClient.graphql(
      ROLLOUTS_ASSIGN_MUTATION,
      withoutStorefrontHeaderCapture(
        withStorefrontApiVersion(
          { signal: AbortSignal.timeout(ROLLOUTS_ASSIGN_TIMEOUT_IN_MS) },
          ROLLOUTS_ASSIGN_API_VERSION,
        ),
      ),
    );
    const userErrorCodes = getUserErrorCodes(result.data);
    if (result.errors || userErrorCodes.length > 0) {
      log.warn("rollouts assignment returned errors", {
        errors: result.errors?.map(({ message }) => message),
        userErrorCodes,
      });
      return { setCookies: [] };
    }

    storefrontClient.requestContext.captureSubrequestHeaders(result.headers);
    const setCookies = result.headers.getSetCookie();
    const prefix = `${SHOPIFY_ESSENTIAL_COOKIE}=`;
    const essential = setCookies
      .map((setCookie) => setCookie.split(";", 1)[0]?.trim() ?? "")
      .find((pair) => pair.startsWith(prefix) && pair.length > prefix.length);
    return {
      setCookies,
      ...(essential && { cookie: replaceCookie(cookie, SHOPIFY_ESSENTIAL_COOKIE, essential) }),
    };
  } catch (error) {
    log.warn("rollouts assignment failed", { error });
    return { setCookies: [] };
  }
}

function getUserErrorCodes(data: unknown): unknown[] {
  const payload = isObjectRecord(data) ? data.rolloutsAssign : undefined;
  const userErrors = isObjectRecord(payload) ? payload.userErrors : undefined;
  if (!Array.isArray(userErrors)) return [];
  return userErrors.map((userError) => (isObjectRecord(userError) ? userError.code : undefined));
}

function replaceCookie(header: string | undefined, name: string, pair: string): string {
  const others = (header ?? "")
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part && !part.startsWith(`${name}=`));
  return [...others, pair].join("; ");
}
