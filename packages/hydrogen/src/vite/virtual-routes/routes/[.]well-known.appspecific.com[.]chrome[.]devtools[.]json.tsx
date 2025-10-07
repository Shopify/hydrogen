import type {LoaderFunctionArgs} from 'react-router';

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
 * Note: The Chrome flag chrome://flags/#devtools-project-settings must be enabled
 * for automatic workspace detection to work (enabled by default in Chrome M-136+).
 *
 * Known Limitations:
 * - On macOS, Chrome may not be able to access the filesystem even with Full Disk Access
 *   granted due to sandboxing and security restrictions
 * - Enterprise policies may prevent automatic workspace detection from functioning
 * - Manual workspace addition may still show empty folders on macOS despite proper permissions
 *
 * @see https://chromium.googlesource.com/devtools/devtools-frontend/+/main/docs/ecosystem/automatic_workspace_folders.md
 */

/**
 * Generate a deterministic UUID-like string using Web Crypto API
 * This works in worker environments and doesn't require external dependencies
 */
async function generateProjectUuid(root: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(root);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // Format as UUID v4-like string
  return [
    hashHex.slice(0, 8),
    hashHex.slice(8, 12),
    '4' + hashHex.slice(13, 16), // Version 4
    ((parseInt(hashHex.slice(16, 18), 16) & 0x3f) | 0x80).toString(16) +
      hashHex.slice(18, 20), // Variant bits
    hashHex.slice(20, 32),
  ].join('-');
}

export async function loader({request, context}: LoaderFunctionArgs) {
  // Get the project root from the environment variable passed by the Hydrogen plugin
  let root =
    (context?.env as {HYDROGEN_PROJECT_ROOT?: string} | undefined)
      ?.HYDROGEN_PROJECT_ROOT || '/workspace/hydrogen-dev';

  // Normalize Windows paths to Unix style for Chrome DevTools
  root = root.replace(/\\/g, '/');

  // Generate a deterministic UUID based on the project path using Web Crypto API
  // This ensures the same UUID for the same project path
  const uuid = await generateProjectUuid(root);

  // Chrome expects just the absolute path, not a file:// URL
  // The automatic workspace detection handles the path format internally

  const responseData = {
    workspace: {
      root,
      uuid,
    },
  };

  return new Response(JSON.stringify(responseData), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    },
  });
}
