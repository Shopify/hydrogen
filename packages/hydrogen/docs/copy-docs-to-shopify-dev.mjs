import {promises as fs} from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SHOPIFY_DEV_DB_SUBPATH =
  'areas/platforms/shopify-dev/db/data/docs/templated_apis';

const HYDROGEN_VERSION = '2025-10';

async function copyGeneratedToShopifyDev() {
  const generatedDocsPath = path.resolve(
    __dirname,
    './generated/generated_docs_data_v2.json',
  );

  // Find the shopify-dev repo: try world first, then relative fallback
  const rootPath = path.resolve(__dirname, '../../..');
  const worldPath = path.join(process.env.HOME, 'world/trees/root/src');

  let shopifyDevPath;
  try {
    await fs.access(worldPath);
    shopifyDevPath = worldPath;
  } catch {
    shopifyDevPath = path.join(rootPath, '../../../shopify-dev');
  }

  const shopifyDevDBPath = path.join(shopifyDevPath, SHOPIFY_DEV_DB_SUBPATH);

  try {
    await fs.access(shopifyDevDBPath);
  } catch {
    console.warn(
      `[h2:docs] shopify-dev not found at ${shopifyDevDBPath}. Skipping copy.`,
    );
    return;
  }

  const destDir = path.join(shopifyDevDBPath, 'hydrogen', HYDROGEN_VERSION);
  const destFile = path.join(destDir, 'generated_docs_data_v2.json');

  await fs.mkdir(destDir, {recursive: true});
  await fs.copyFile(generatedDocsPath, destFile);

  console.log(`[h2:docs] Copied generated_docs_data_v2.json → ${destFile}`);
}

copyGeneratedToShopifyDev().catch((err) => {
  console.error(err);
  process.exit(1);
});
