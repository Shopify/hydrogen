import fs from 'node:fs/promises';
import path from 'node:path';
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http';
import {lookup as lookupMimeType} from 'mrmime';
import {request} from 'undici';
import {getErrorPage} from '../common/error-page.js';

export const DEFAULT_ASSETS_PORT = 9100;

// Mimics path in Shopify CDN for Oxygen v2
const artificialAssetPrefix = 'mini-oxygen/00000/11111/22222/33333';

/**
 * Returns a URL to the static assets server.
 */
export function buildAssetsUrl(
  assetsPort = DEFAULT_ASSETS_PORT,
  options?: {trailingSlash: boolean},
) {
  return `http://localhost:${assetsPort}/${artificialAssetPrefix}${
    options?.trailingSlash === false ? '' : '/'
  }`;
}

type AssetsServerOptions = {
  resource: string;
  strictPath?: boolean;
};

type AssetHandler = (
  req: IncomingMessage,
  res: ServerResponse<IncomingMessage>,
  relativeAssetPath: string,
) => Promise<boolean>;

/**
 * Creates a server that serves static assets from the build directory
 * or another origin server. It mimics Shopify CDN URLs for Oxygen v2.
 */
export function createAssetsServer({
  resource,
  strictPath = true,
}: AssetsServerOptions) {
  const handleAsset: AssetHandler = resource.includes('://')
    ? async function serveFromOrigin(req, res, relativeAssetPath) {
        const url = new URL(relativeAssetPath, resource);

        const {body, headers, statusCode} = await request(url, {
          responseHeader: 'raw',
          headers: req.headers,
        });

        if (statusCode === 404) return false;

        res.writeHead(statusCode, headers);
        body.pipe(res);
        return true;
      }
    : async function serveFromDisk(req, res, relativeAssetPath) {
        const filePath = path.join(resource, relativeAssetPath);

        // Ignore errors and just return 404
        const file = await fs.open(filePath).catch(() => {});
        const stat = await file?.stat().catch(() => {});

        if (!file || !stat?.isFile()) return false;

        res.setHeader('Content-Length', stat.size);
        res.setHeader(
          'Content-Type',
          lookupMimeType(filePath) || 'application/octet-stream',
        );

        file.createReadStream().pipe(res);
        return true;
      };

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
      (!strictPath || pathname.startsWith(`/${artificialAssetPrefix}/`)) &&
      !pathname.includes('..'); // Ensure it doesn't leave the build directory

    const relativeAssetPath = isValidAssetPath
      ? pathname.replace(`/${artificialAssetPrefix}`, '')
      : pathname;

    const isAssetFound = isValidAssetPath
      ? await handleAsset(req, res, relativeAssetPath)
      : false;

    if (!isAssetFound) {
      // Mimic what Shopify CDN returns for 404s
      res.writeHead(404, {'Content-Type': 'text/html; charset=utf-8'});
      res.end(
        getErrorPage({
          title: '404: Page not found',
          header: '404 NOT FOUND',
          message: isValidAssetPath
            ? 'The following file was not found in your project directory:'
            : 'The following URL pathname is not valid:',
          code: relativeAssetPath,
        }),
      );
    }
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
