import fs from 'node:fs/promises';
import path from 'node:path';
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http';
import {lookupMimeType} from '@shopify/cli-kit/node/mimes';

const html = String.raw;

export function createAssetsServer(buildPathClient: string) {
  return createServer(async (req: IncomingMessage, res: ServerResponse) => {
    // Similar headers to Shopify CDN
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    const relativePath = req.url?.split('?')[0] || '';
    const filePath = path.join(buildPathClient, relativePath);

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
          <pre>${relativePath}</pre>
        </body>
      </html>`,
    );
  });
}

export function buildAssetsUrl(assetsPort: number) {
  return `http://localhost:${assetsPort}/`;
}
