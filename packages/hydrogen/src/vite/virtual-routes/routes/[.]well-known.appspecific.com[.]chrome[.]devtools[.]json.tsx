import type {LoaderFunctionArgs} from '@shopify/remix-oxygen';

/**
 * Chrome DevTools Automatic Workspace Configuration
 *
 * This virtual route serves the Chrome DevTools workspace configuration file
 * that enables automatic workspace folder detection in Chrome M-135+.
 *
 * When developers open Chrome DevTools on localhost, Chrome requests this file
 * to auto-configure workspace settings. Without this file, developers see 404
 * errors in the console which creates visual noise.
 *
 * @see https://chromium.googlesource.com/devtools/devtools-frontend/+/main/docs/ecosystem/automatic_workspace_folders.md
 */
export async function loader({request}: LoaderFunctionArgs) {
  // Use the request URL as a deterministic seed for the UUID
  const url = new URL(request.url);
  const origin = url.origin;

  // Simple hash function for generating a deterministic UUID from the origin
  let hash = 0;
  for (let i = 0; i < origin.length; i++) {
    const char = origin.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  // Convert hash to hex and pad to ensure we have enough characters
  const hexHash = Math.abs(hash).toString(16).padEnd(32, '0');

  // Format as UUID v4
  const uuid = [
    hexHash.substring(0, 8),
    hexHash.substring(8, 12),
    '4' + hexHash.substring(13, 16), // Version 4
    '8' + hexHash.substring(17, 20), // Variant bits
    hexHash.substring(20, 32),
  ].join('-');

  // For development, use a placeholder path that indicates this is a virtual workspace
  const root = '/workspace/hydrogen-dev';

  const responseData = {
    workspace: {root, uuid},
  };

  return new Response(JSON.stringify(responseData), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    },
  });
}
