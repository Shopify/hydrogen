export type PublicEnv = Pick<Env, `PUBLIC_${string}` & keyof Env> | null;

/*
 * Returns a subset of the environment variables that are prefixed with PUBLIC_
 * @param env - The environment variables
 * @example
 * ```ts
 *  const env = {
 *    PUBLIC_API_URL: 'https://api.example.com',
 *    PRIVATE_TOKEN: '1234567890',
 *    PUBLIC_APP_NAME: 'My App',
 *  }
 *  const publicEnv = getPublicEnv(env);
 *  // -> {  PUBLIC_API_URL: 'https://api.example.com',  PUBLIC_APP_NAME: 'My App' }
 * ```
 */
export function getPublicEnv(env: Env): PublicEnv {
  if (typeof env !== 'object') {
    return null;
  }

  const defaultPublicEnv = {} as PublicEnv;

  const publicEnv = Object.keys(env).reduce((acc, key) => {
    if (acc && key.startsWith('PUBLIC_')) {
      const envKey = key as keyof PublicEnv;
      const envValue = env[envKey];
      acc[envKey] = envValue;
    }
    return acc;
  }, defaultPublicEnv);

  if (publicEnv && Object.keys(publicEnv).length === 0) {
    return null;
  }

  return publicEnv;
}
