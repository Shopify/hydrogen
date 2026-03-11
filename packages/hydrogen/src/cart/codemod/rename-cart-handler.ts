// @ts-nocheck - jscodeshift is a peer dependency, not bundled
/**
 * jscodeshift codemod: Renames `createCartHandler` to `createHydrogenCart`
 *
 * Usage:
 *   npx jscodeshift -t packages/hydrogen/src/cart/codemod/rename-cart-handler.ts <target-files>
 *
 * This is the safe migration path — existing users get identical behavior
 * with the new name. They can then optionally migrate to `createCartHandler`
 * with explicit methods for tree-shaking.
 */
import type {API, FileInfo} from 'jscodeshift';

export default function transform(file: FileInfo, api: API) {
  const j = api.jscodeshift;
  const root = j(file.source);
  let hasChanges = false;

  // Rename import specifier: createCartHandler -> createHydrogenCart
  root
    .find(j.ImportDeclaration, {
      source: {value: '@shopify/hydrogen'},
    })
    .forEach((path) => {
      const specifiers = path.node.specifiers;
      if (!specifiers) return;

      for (const specifier of specifiers) {
        if (
          specifier.type === 'ImportSpecifier' &&
          specifier.imported.type === 'Identifier' &&
          specifier.imported.name === 'createCartHandler'
        ) {
          specifier.imported.name = 'createHydrogenCart';
          // Also rename local name if it wasn't aliased
          if (specifier.local && specifier.local.name === 'createCartHandler') {
            specifier.local.name = 'createHydrogenCart';
          }
          hasChanges = true;
        }
      }
    });

  // Rename all usages of createCartHandler -> createHydrogenCart
  root.find(j.Identifier, {name: 'createCartHandler'}).forEach((path) => {
    // Skip import specifiers (already handled above)
    if (
      path.parent.node.type === 'ImportSpecifier' &&
      path.parent.node.imported === path.node
    ) {
      return;
    }
    path.node.name = 'createHydrogenCart';
    hasChanges = true;
  });

  return hasChanges ? root.toSource() : file.source;
}
