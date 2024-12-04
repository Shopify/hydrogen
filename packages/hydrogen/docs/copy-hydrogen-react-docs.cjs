const fs = require('fs').promises;
const path = require('path');

const docsToCopy = [
  'Image',
  'ExternalVideo',
  'MediaFile',
  'Money',
  'ModelViewer',
  'ShopPayButton',
  'RichText',
  'Video',
  'useMoney',
  'useLoadScript',
  'useShopifyCookies',
  'decodeEncodedVariant',
  'flattenConnection',
  'getAdjacentAndFirstAvailableVariants',
  'getClientBrowserParameters',
  'getProductOptions',
  'getShopifyCookies',
  'isOptionValueCombinationInEncodedVariant',
  'mapSelectedProductOptionToObject',
  'parseGid',
  'parseMetafield',
  'sendShopifyAnalytics',
  'storefrontApiCustomScalars',
  'Storefront Schema',
  'Storefront API Types',
];

async function copyFiles() {
  console.log('Copying Hydrogen React docs to Hydrogen docs...');

  const hydrogenDocsPath = path.resolve(
    __dirname,
    '../docs/generated/generated_docs_data.json',
  );
  const hydrogenReactDocsPath = path.resolve(
    __dirname,
    '../../hydrogen-react/docs/generated/generated_docs_data.json',
  );

  const hydrogenDocsData = JSON.parse(
    await fs.readFile(hydrogenDocsPath, 'utf8'),
  );
  const hydrogenReactDocsData = JSON.parse(
    await fs.readFile(hydrogenReactDocsPath, 'utf8'),
  );

  for (const doc of docsToCopy) {
    const docData = hydrogenReactDocsData.find(
      (docData) => docData.name === doc,
    );
    if (!docData) {
      throw new Error(`Could not find doc "${doc}" in Hydrogen React docs`);
    } else {
      hydrogenDocsData.push(updatePaths(docData));
    }
  }

  await fs.writeFile(
    hydrogenDocsPath,
    JSON.stringify(hydrogenDocsData, null, 2),
  );
}

function updatePaths(doc) {
  if (doc.related) {
    doc.related = doc.related.map((relatedDoc) => {
      return {
        ...relatedDoc,
        url: relatedDoc.url.replaceAll('hydrogen-react', 'hydrogen'),
      };
    });
  }

  doc.defaultExample.codeblock.tabs = doc.defaultExample.codeblock.tabs.map(
    (tab) => {
      return {
        ...tab,
        code: tab.code.replaceAll('hydrogen-react', 'hydrogen'),
      };
    },
  );

  if (doc.examples) {
    doc.examples.examples = doc.examples.examples.map((example) => {
      return {
        ...example,
        codeblock: {
          ...example.codeblock,
          tabs: example.codeblock.tabs.map((tab) => {
            return {
              ...tab,
              code: tab.code.replaceAll('hydrogen-react', 'hydrogen'),
            };
          }),
        },
      };
    });
  }

  return doc;
}

copyFiles()
  .then(() => console.log('Done!'))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
