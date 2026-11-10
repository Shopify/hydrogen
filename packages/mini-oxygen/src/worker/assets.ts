import fs from 'node:fs/promises';
import path from 'node:path';
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http';
import {lookup as lookupMimeType} from 'mrmime';
import {getErrorPage} from '../common/error-page.js';

// Mimics path in Shopify CDN for Oxygen v2
const artificialAssetPrefix = 'mini-oxygen/00000/11111/22222/33333';

/**
 * Returns a URL to the static assets server.
 */
export function buildAssetsUrl(assetsPort: number) {
  return `http://localhost:${assetsPort}/${artificialAssetPrefix}/`;
}

/**
 * Creates a server that serves static assets from the build directory.
 * Mimics Shopify CDN URLs for Oxygen v2.
 * Note: this is not used when running with Vite because it already
 * serves transformed assets before reaching MiniOxygen.
 * See the following for more details:
 * @see https://github.com/Shopify/hydrogen/pull/2078#issuecomment-2121705993
 */
export function createAssetsServer(assetsDirectory: string) {
  return createServer(async (req: IncomingMessage, res: ServerResponse) => {
    // Similar headers to Shopify CDN
    if (req.method === 'OPTIONS') {
      // Setting PNA preflight headers
      // https://developer.chrome.com/blog/private-network-access-preflight
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Private-Network', 'true');
      res.setHeader('Access-Control-Max-Age', '86400');
      res.writeHead(204);
      res.end();
      return;
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    const pathname = req.url?.split('?')[0] || '';
    const isValidAssetPath =
      pathname.startsWith(`/${artificialAssetPrefix}/`) &&
      !pathname.includes('..'); // Ensure it doesn't leave the build directory

    const relativeAssetPath = isValidAssetPath
      ? pathname.replace(`/${artificialAssetPrefix}`, '')
      : pathname;

    if (isValidAssetPath) {
      const filePath = path.join(assetsDirectory, relativeAssetPath);

      // Ignore errors and just return 404
      const file = await fs.open(filePath).catch(() => {});
      const stat = await file?.stat().catch(() => {});

      if (file && stat?.isFile()) {
        res.setHeader('Content-Length', stat.size);

        res.setHeader(
          'Content-Type',
          lookupMimeType(filePath) || 'application/octet-stream',
        );

        return file.createReadStream().pipe(res);
      }
    }

    // -- File was not found:

    res.writeHead(404, {'Content-Type': 'text/html; charset=utf-8'});

    // Mimic what Shopify CDN returns for 404s
    res.end(
      getErrorPage({
        title: '404: Page not found',
        header: '404 NOT FOUND',
        message: isValidAssetPath
          ? 'This file was not found in the build output directory:'
          : 'The following URL pathname is not valid:',
        code: relativeAssetPath,
      }),
    );
  });
}

// Similar extensions to what oxygen-workers proxies:
export const STATIC_ASSET_EXTENSIONS = Object.freeze([
  '7Z',
  'CSV',
  'GIF',
  'MIDI',
  'PNG',
  'TIF',
  'ZIP',
  'AVI',
  'DOC',
  'GZ',
  'MKV',
  'PPT',
  'TIFF',
  'ZST',
  'AVIF',
  'DOCX',
  'ICO',
  'MP3',
  'PPTX',
  'TTF',
  'APK',
  'DMG',
  'ISO',
  'MP4',
  'PS',
  'WEBM',
  'BIN',
  'EJS',
  'JAR',
  'OGG',
  'RAR',
  'WEBP',
  'BMP',
  'EOT',
  'JPG',
  'OTF',
  'SVG',
  'WOFF',
  'BZ2',
  'EPS',
  'JPEG',
  'PDF',
  'SVGZ',
  'WOFF2',
  'CLASS',
  'EXE',
  'JS',
  'PICT',
  'SWF',
  'XLS',
  'CSS',
  'FLAC',
  'MID',
  'PLS',
  'TAR',
  'XLSX',
  'TXT',
  'XML',
  'MAP',
  'HTML',
  'GLB',
  'JSON',
]);
