import { AbortSuiteError, type SkipTestGroupError } from "./matcher-fixture";

type GraphQLError = {
  readonly message: string;
};

type SuiteError = typeof AbortSuiteError | typeof SkipTestGroupError;

const GRAPHQL_DISCOVERY_TIMEOUT_MS = 30_000;
const ROUTE_AVAILABILITY_TIMEOUT_MS = 10_000;

export function createGraphQLDiscoverySignal(): AbortSignal {
  return AbortSignal.timeout(GRAPHQL_DISCOVERY_TIMEOUT_MS);
}

type RouteValidationInput = {
  readonly storefrontBaseUrl: string;
  readonly path: string;
  readonly reason: string;
  readonly unavailableError?: SuiteError;
};

export async function assertRouteAvailable({
  storefrontBaseUrl,
  path,
  reason,
  unavailableError = AbortSuiteError,
}: RouteValidationInput): Promise<void> {
  const url = new URL(path, storefrontBaseUrl);
  const response = await globalThis
    .fetch(url, {
      signal: AbortSignal.timeout(ROUTE_AVAILABILITY_TIMEOUT_MS),
    })
    .catch((error: unknown) => {
      throw new unavailableError(`${reason}: ${formatUnknownError(error)}`);
    });

  if (response.ok) return;

  throw new unavailableError(`${reason}: ${url.pathname} returned HTTP ${response.status}`);
}

export function abortOnGraphQLErrors(
  label: string,
  errors: readonly GraphQLError[] | undefined,
): void {
  if (errors === undefined || errors.length === 0) return;

  throw new AbortSuiteError(
    `${label} is not available because of an error: ${errors
      .map((error) => error.message)
      .join("; ")}`,
  );
}

function formatUnknownError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
