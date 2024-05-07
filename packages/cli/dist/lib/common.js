import { AbortError } from '@shopify/cli-kit/node/error';
import colors from '@shopify/cli-kit/node/colors';

function orderEnvironmentsBySafety(environments) {
  return [
    ...environments.filter((environment) => environment.type === "PREVIEW"),
    ...environments.filter((environment) => environment.type === "CUSTOM"),
    ...environments.filter((environment) => environment.type === "PRODUCTION")
  ];
}
function createEnvironmentCliChoiceLabel(name, handle, branch) {
  const metadataStringified = Object.entries({ handle, branch }).reduce((acc, [key, val]) => {
    if (val) {
      acc.push(`${key}: ${val}`);
    }
    return acc;
  }, []).join(", ");
  return `${name} ${colors.dim(`(${metadataStringified})`)}`;
}
function findEnvironmentOrThrow(environments, envHandle) {
  const matchedEnvironment = environments.find(
    ({ handle }) => handle === envHandle
  );
  if (!matchedEnvironment) {
    throw environmentNotFound("handle", envHandle);
  }
  return matchedEnvironment;
}
function findEnvironmentByBranchOrThrow(environments, branch) {
  const matchedEnvironment = environments.find(({ branch: b }) => b === branch);
  if (!matchedEnvironment) {
    throw environmentNotFound("branch", branch);
  }
  return matchedEnvironment;
}
function environmentNotFound(criterion, value) {
  return new AbortError(
    "Environment not found",
    `We could not find an environment matching the ${criterion} '${value}'.`,
    [
      [
        "Run",
        { command: "env list" },
        "to view a list of available environments."
      ]
    ]
  );
}

export { createEnvironmentCliChoiceLabel, findEnvironmentByBranchOrThrow, findEnvironmentOrThrow, orderEnvironmentsBySafety };
