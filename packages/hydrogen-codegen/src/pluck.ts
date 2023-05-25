import fs from 'fs/promises';
import path from 'path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

export async function patchGqlPluck() {
  const require = createRequire(import.meta.url);
  const realGqlTagPluck = require.resolve('@graphql-tools/graphql-tag-pluck');
  // During tests, this file is in src/xyz.ts but in dev/prod,
  // the file is in dist/(esm|cjs)/xyz.js
  const depth = path.extname(import.meta.url) === '.ts' ? '../' : '../../';
  const vendorGqlTagPluck = fileURLToPath(
    new URL(depth + '/vendor/graphql-tag-pluck', import.meta.url),
  );

  // Copy files sequencially to avoid `EBUSY` errors in Windows
  await fs.copyFile(
    path.join(vendorGqlTagPluck, 'visitor.cjs'),
    realGqlTagPluck.replace(/index\.js$/, 'visitor.js'),
  );

  await fs.copyFile(
    path.join(vendorGqlTagPluck, 'visitor.mjs'),
    realGqlTagPluck.replace('cjs', 'esm').replace(/index\.js$/, 'visitor.js'),
  );
}

/**
 * This is a modified version of graphql-tag-pluck's default config.
 * https://github.com/ardatan/graphql-tools/issues/5127
 */
export const pluckConfig = {
  /**
   * Hook to determine if a node is a gql template literal.
   * By default, graphql-tag-pluck only looks for leading comments or `gql` tag.
   */
  isGqlTemplateLiteral: (node: any, options: any) => {
    // Check for internal gql comment: const QUERY = `#graphql ...`
    const hasInternalGqlComment =
      node.type === 'TemplateLiteral' &&
      /\s*#graphql\s*\n/i.test(node.quasis[0]?.value?.raw || '');

    if (hasInternalGqlComment) return true;

    // Check for leading gql comment: const QUERY = /* GraphQL */ `...`
    const {leadingComments} = node;
    const leadingComment = leadingComments?.[leadingComments?.length - 1];
    const leadingCommentValue = leadingComment?.value?.trim().toLowerCase();

    return leadingCommentValue === options?.gqlMagicComment;
  },

  /**
   * Instruct how to extract the gql template literal from the code.
   * By default, embedded expressions in template literals (e.g. ${foo})
   * are removed from the template string. This hook allows us to annotate
   * the template string with the required embedded expressions instead of
   * removing them. Later, we can use this information to reconstruct the
   * embedded expressions.
   */
  pluckStringFromFile: (code: string, {start, end, leadingComments}: any) => {
    let gqlTemplate = code
      // Slice quotes
      .slice(start + 1, end - 1)
      // Annotate embedded expressions
      // e.g. ${foo} -> #REQUIRED_VAR=foo
      .replace(/\$\{([^}]*)\}/g, (_, m1) => '#REQUIRED_VAR=' + m1)
      .split('\\`')
      .join('`');

    const chunkStart = leadingComments?.[0]?.start ?? start;
    const codeBeforeNode = code.slice(0, chunkStart);
    const [, varName] = codeBeforeNode.match(/\s(\w+)\s*=\s*$/) || [];

    if (varName) {
      // Annotate with the name of the variable that stores this gql template.
      // This is used to reconstruct the embedded expressions later.
      gqlTemplate += '#VAR_NAME=' + varName;
    }

    return gqlTemplate;
  },
};
