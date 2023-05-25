import path from 'path';
import fs from 'fs/promises';
import {fileURLToPath} from 'url';

(async () => {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const hydrogenReact = 'packages/hydrogen-react';
  const hydrogenPkgDist = 'packages/hydrogen/dist';
  const schemaFile = 'storefront.schema.json';
  const typeFile = 'storefront-api-types.d.ts';

  await fs.mkdir(path.resolve(root, hydrogenPkgDist), {recursive: true});

  await fs.copyFile(
    path.resolve(root, hydrogenReact, schemaFile),
    path.resolve(root, hydrogenPkgDist, schemaFile),
  );

  await fs.copyFile(
    path.resolve(root, hydrogenReact, 'src', typeFile),
    path.resolve(root, hydrogenPkgDist, typeFile),
  );
})();
