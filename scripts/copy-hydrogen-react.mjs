import path from 'path';
import fs from 'fs/promises';
import {fileURLToPath} from 'url';

(async () => {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const hydrogenReact = 'node_modules/@shopify/hydrogen-react';
  const hydrogenPkgDist = 'packages/hydrogen/dist';
  const schemaFile = 'storefront.schema.json';
  const typeFile = 'storefront-api-types.d.ts';

  await fs.copyFile(
    path.resolve(root, hydrogenReact, schemaFile),

    path.resolve(root, hydrogenPkgDist, schemaFile),
  );

  await fs.copyFile(
    path.resolve(root, hydrogenReact, 'dist/types', typeFile),
    path.resolve(root, hydrogenPkgDist, typeFile),
  );
})();
