import semver from 'semver';
import {resolvePath} from '@shopify/cli-kit/node/path';
import {glob, readFile, writeFile} from '@shopify/cli-kit/node/fs';
import {getViteConfig} from '../lib/vite-config.js';
import {AbortError} from '@shopify/cli-kit/node/error';
import {importLangAstGrep} from '../lib/ast.js';
import {renderSelectPrompt} from '@shopify/cli-kit/node/ui';

export default {
  version: '2025.4.1',
  async codemod(path: string) {
    const shouldUpdateImports = await renderSelectPrompt({
      message: `Do you want run a codemap that upates the imports from @shopify/remix-oxygen to react-router?`,
      choices: [
        {
          label: 'Yes',
          value: 'yes',
        },
        {
          label: 'No',
          value: 'no',
        },
      ],
      defaultValue: 'yes',
    });

    if (shouldUpdateImports === 'yes') {
      await updateOxygenImports(path);
    }
  },
};

async function updateOxygenImports(path: string) {
  const directory = resolvePath(path);

  const viteConfig = await getViteConfig(directory).catch(() => null);

  if (!viteConfig) {
    throw new AbortError(
      'No Vite config found. This command is only supported in Vite projects.',
    );
  }

  const {remixConfig} = viteConfig;

  const files = await glob('**/*.{js,jsx,ts,tsx}', {
    cwd: remixConfig.appDirectory,
    absolute: true,
  });

  for (const file of files) {
    const content = await readFile(file, {encoding: 'utf8'});
    const fileExtension = file.split('.').pop()! as 'ts' | 'tsx' | 'js' | 'jsx';
    const astGrep = await importLangAstGrep(fileExtension);
    const ast = astGrep.parse(content);
    const root = ast.root();

    // Find all import statements
    const importNodes = root.findAll({
      rule: {
        kind: 'import_statement',
      },
    });

    // Filter for imports from @shopify/remix-oxygen
    const remixOxygenImports = importNodes.filter((node) => {
      const nodeText = node.text();
      return nodeText.includes('@shopify/remix-oxygen');
    });

    // Skip if no imports found
    if (remixOxygenImports.length === 0) continue;

    let updatedContent = content;

    for (const importNode of remixOxygenImports) {
      const importText = importNode.text();

      // Create a new import statement with the same imports but from react-router
      const newImportText = importText.replace(
        /@shopify\/remix-oxygen/g,
        'react-router',
      );

      // Replace the old import with the new one
      updatedContent = updatedContent.replace(importText, newImportText);
    }

    // Only write the file if changes were made
    if (updatedContent !== content) {
      await writeFile(file, updatedContent);
      console.log(`Updated imports in ${file}`);
    }
  }
}
