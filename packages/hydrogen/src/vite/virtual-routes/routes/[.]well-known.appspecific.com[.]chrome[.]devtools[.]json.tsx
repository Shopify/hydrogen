import type {LoaderFunctionArgs} from '@shopify/remix-oxygen';
import {v4 as uuidv4, v5 as uuidv5} from 'uuid';

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
export async function loader({request, context}: LoaderFunctionArgs) {
  // Get the project root from the environment variable passed by the Hydrogen plugin
  // @ts-ignore - env is injected by MiniOxygen in development
  let root = context?.env?.HYDROGEN_PROJECT_ROOT || '/workspace/hydrogen-dev';

  // Normalize Windows paths to Unix style for Chrome DevTools
  root = root.replace(/\\/g, '/');

  // Generate a deterministic UUID v5 based on the project path
  // This ensures the same UUID for the same project path
  const HYDROGEN_NAMESPACE = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
  const uuid = uuidv5(root, HYDROGEN_NAMESPACE);

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
