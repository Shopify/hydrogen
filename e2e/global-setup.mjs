import {startDevServer} from './server.mjs';

const defaultPort = '3100';

/**
 * Global setup that starts the dev server and captures the URL.
 * Makes the URL available to tests via process.env.E2E_BASE_URL
 */
export default async function globalSetup() {
  const port = parseInt(process.env.PORT || defaultPort, 10);
  console.log('[Global Setup] Starting dev server...');

  const server = await startDevServer({
    port,
    customerAccountPush: true,
  }).catch((error) => {
    console.error(
      `\n\u001b[1;31m[Global Setup] Failed to start dev server:\n${error.message}`,
    );
    process.exit(1);
  });

  const url = server.getUrl();
  process.env.BASE_URL = url;

  if (url.includes('localhost')) {
    throw new Error(
      'Failed to find public URL for Customer Account Push tests',
    );
  }

  console.log(`[Global Setup] Server ready at: ${url}`);

  return async () => {
    console.log('[Global Teardown] Stopping dev server...');
    await server.stop();
  };
}
