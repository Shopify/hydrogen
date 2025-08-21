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
export async function loader({request, context}: LoaderFunctionArgs) {
  // Get the project root from the environment variable passed by the Hydrogen plugin
  // @ts-ignore - env is injected by MiniOxygen in development
  let root = context?.env?.HYDROGEN_PROJECT_ROOT || '/workspace/hydrogen-dev';
  
  // Normalize Windows paths to Unix style for Chrome DevTools
  root = root.replace(/\\/g, '/');

  // Generate a deterministic UUID based on the project path
  let hash = 0;
  for (let i = 0; i < root.length; i++) {
    const char = root.charCodeAt(i);
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
