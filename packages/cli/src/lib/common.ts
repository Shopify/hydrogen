import {AbortError} from '@shopify/cli-kit/node/error';

export function findEnvironmentOrThrow<Environment extends {handle: string}>(
  environments: Array<Environment>,
  envHandle: string,
): Environment {
  const matchedEnvironment = environments.find(
    ({handle}) => handle === envHandle,
  );
  if (!matchedEnvironment) {
    throw environmentNotFound('handle', envHandle);
  }

  return matchedEnvironment;
}

export function findEnvironmentByBranchOrThrow<
  Environment extends {branch: string | null},
>(environments: Array<Environment>, branch: string): Environment {
  const matchedEnvironment = environments.find(({branch: b}) => b === branch);
  if (!matchedEnvironment) {
    throw environmentNotFound('branch', branch);
  }

  return matchedEnvironment;
}

function environmentNotFound(criterion: string, value: string) {
  return new AbortError(
    'Environment not found',
    `We could not find an environment matching the ${criterion} '${value}'.`,
    [
      [
        'Run',
        {command: 'env list'},
        'to view a list of available environments.',
      ],
    ],
  );
}
