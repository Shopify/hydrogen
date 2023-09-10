import path from 'path';
import fs from 'fs';
import {fileURLToPath} from 'url';

const CHANGESET_ALL = `---
'@shopify/hydrogen-react': patch
'demo-store': patch
'@shopify/hydrogen': patch
'@shopify/cli-hydrogen': patch
'@shopify/create-hydrogen': patch
'@shopify/hydrogen-codegen': patch
'@shopify/remix-oxygen': patch
---

Trigger changeset for all packages for next release
`;

(async () => {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const changesetPath = path.resolve(root, '.changeset', 'trigger-patch-for-next-release.md');

  await fs.writeFile(changesetPath, CHANGESET_ALL, () => {});
})();
