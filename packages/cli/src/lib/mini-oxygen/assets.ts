import fs from 'node:fs/promises';
import path from 'node:path';
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http';
import {lookupMimeType} from '@shopify/cli-kit/node/mimes';

const html = String.raw;

// Mimic path in Shopify CDN for Oxygen v2
const artificialAssetPrefix = 'mini-oxygen/00000/11111/22222/33333';

export function createAssetsServer(buildPathClient: string) {
  return createServer(async (req: IncomingMessage, res: ServerResponse) => {
    // Similar headers to Shopify CDN
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
      const filePath = path.join(buildPathClient, relativeAssetPath);

      try {
        const file = await fs.open(filePath);
        const stat = await file.stat();

        if (stat.isFile()) {
          res.setHeader('Content-Length', stat.size);

          res.setHeader(
            'Content-Type',
            lookupMimeType(filePath) || 'application/octet-stream',
          );

          return file.createReadStream().pipe(res);
        }
      } catch {}
    }

    // -- File was not found:

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.writeHead(404);

    // Mimic what Shopify CDN does for 404s
    res.end(
      html`<html>
        <head>
          <title>404: Page not found</title>
        </head>
        <body
          style="display: flex; flex-direction: column; align-items: center; padding-top: 20px; font-family: Arial"
        >
          <h2>404 NOT FOUND</h2>
          <p>This file was not found in the build output directory:</p>
          <pre>${relativeAssetPath}</pre>
        </body>
      </html>`,
    );
  });
}

export function buildAssetsUrl(assetsPort: number) {
  return `http://localhost:${assetsPort}/${artificialAssetPrefix}/`;
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
