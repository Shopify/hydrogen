import { fileExists } from '@shopify/cli-kit/node/fs';
import { resolvePath } from '@shopify/cli-kit/node/path';
import { linesToColumns } from '@shopify/cli-kit/common/string';
import { outputInfo } from '@shopify/cli-kit/node/output';
import { readAndParseDotEnv } from '@shopify/cli-kit/node/dot-env';
import { renderWarning } from '@shopify/cli-kit/node/ui';
import colors from '@shopify/cli-kit/node/colors';
import { getStorefrontEnvVariables } from './graphql/admin/pull-variables.js';
import { getStorefrontEnvironments } from './graphql/admin/list-environments.js';
import { findEnvironmentByBranchOrThrow } from './common.js';
import { login } from './auth.js';

const createEmptyRemoteVars = () => ({
  remoteVariables: {},
  remoteSecrets: {}
});
async function getAllEnvironmentVariables({
  root,
  envHandle,
  envBranch,
  fetchRemote = true,
  localVariables: inlineLocalVariables
}) {
  const [{ remoteVariables, remoteSecrets }, { variables: localVariables }] = await Promise.all([
    // Get remote vars
    fetchRemote ? getRemoteVariables(root, envHandle, envBranch).catch(
      (error) => {
        renderWarning({
          headline: "Failed to load environment variables from Shopify. The development server will still start, but the following error occurred:",
          body: [error.message, error.tryMessage, error.nextSteps].filter(Boolean).join("\n\n")
        });
        return createEmptyRemoteVars();
      }
    ) : createEmptyRemoteVars(),
    // Get local vars
    inlineLocalVariables ? { variables: inlineLocalVariables } : getLocalVariables(root)
  ]);
  const remoteSecretKeys = Object.keys(remoteSecrets);
  const remotePublicKeys = Object.keys(remoteVariables);
  const localKeys = Object.keys(localVariables);
  function logInjectedVariables() {
    if (localKeys.length > 0 || remotePublicKeys.length + remoteSecretKeys.length > 0) {
      outputInfo("\nEnvironment variables injected into MiniOxygen:\n");
      outputInfo(
        linesToColumns([
          ...remotePublicKeys.filter((key) => !localKeys.includes(key)).map((key) => [key, "from Oxygen"]),
          ...localKeys.map((key) => [key, "from local .env"]),
          // Ensure secret variables always get added to the bottom of the list
          ...remoteSecretKeys.filter((key) => !localKeys.includes(key)).map((key) => [
            colors.dim(key),
            colors.dim("from Oxygen (Marked as secret)")
          ])
        ])
      );
    }
  }
  return {
    logInjectedVariables,
    remoteVariables,
    remoteSecrets,
    localVariables,
    allVariables: {
      ...remoteSecrets,
      ...remoteVariables,
      ...localVariables
    }
  };
}
async function getRemoteVariables(root, envHandle, envBranch) {
  const { session, config } = await login(root);
  if (envBranch) {
    const environments = (await getStorefrontEnvironments(session, config.storefront.id))?.environments || [];
    envHandle = findEnvironmentByBranchOrThrow(environments, envBranch).handle;
  }
  const envVariables = (await getStorefrontEnvVariables(session, config.storefront.id, envHandle))?.environmentVariables || [];
  const remoteVariables = {};
  const remoteSecrets = {};
  for (const { key, value, isSecret } of envVariables) {
    if (isSecret)
      remoteSecrets[key] = value;
    else
      remoteVariables[key] = value;
  }
  return { remoteVariables, remoteSecrets };
}
async function getLocalVariables(root) {
  const dotEnvPath = resolvePath(root, ".env");
  return await fileExists(dotEnvPath).then(
    (exists) => exists ? readAndParseDotEnv(dotEnvPath) : { variables: {} }
  );
}

export { getAllEnvironmentVariables, getLocalVariables };
