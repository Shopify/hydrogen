import {ui} from '@shopify/cli-kit';

import type {ObjectExpression} from 'jscodeshift';
import type {Transform} from '../../utils/transform.js';
import {
  hasImportDeclaration,
  insertImportSpecifier,
  hasImportSpecifier,
  insertImportDeclaration,
  removeImportSpecifier,
} from '../../utils/imports.js';
import {runChangesets, type UpgradeOptions} from '../../utils/upgrades.js';
import {parseGuide} from '../../utils/parse-guide.js';

export default async function v2023_1_6(
  directory: string,
  options: UpgradeOptions = {},
) {
  const changes = parseGuide(import.meta.url);

  const tasks = ui.newListr(
    await runChangesets(
      directory,
      changes,
      [insertNewImports(), insertNewStorefrontParams()],
      options,
    ),
  );

  return tasks;
}

export const insertNewImports = (): Transform => {
  return (j, source, sourcePath) => {
    if (
      !sourcePath.endsWith('server.ts') &&
      !sourcePath.endsWith('server.js')
    ) {
      return source.toSource();
    }

    if (hasImportDeclaration(j, source, '@shopify/remix-oxygen')) {
      if (
        hasImportSpecifier(j, source, 'getBuyerIp', '@shopify/remix-oxygen')
      ) {
        removeImportSpecifier(j, source, 'getBuyerIp', '@shopify/remix-oxygen');
      }

      if (
        !hasImportSpecifier(
          j,
          source,
          'getStorefrontHeaders',
          '@shopify/remix-oxygen',
        )
      ) {
        insertImportSpecifier(
          j,
          source,
          'getStorefrontHeaders',
          '@shopify/remix-oxygen',
        );
      }
    } else {
      insertImportDeclaration(
        j,
        source,
        'getStorefrontHeaders',
        '@shopify/remix-oxygen',
        '@shopify/hydrogen',
      );
    }

    return source.toSource();
  };
};

export const insertNewStorefrontParams = (): Transform => {
  return (j, source, sourcePath) => {
    if (
      !sourcePath.endsWith('server.ts') &&
      !sourcePath.endsWith('server.js')
    ) {
      return source.toSource();
    }

    source
      .find(j.CallExpression)
      .filter(
        ({node: callExpression}) =>
          callExpression.callee.type === 'Identifier' &&
          callExpression.callee.name === 'createStorefrontClient',
      )
      .forEach((path) => {
        path.node.arguments.forEach((arg) => {
          if (arg.type !== 'ObjectExpression') {
            return;
          }

          const propsToKeep = removePropertiesFromObject(arg, [
            'buyerIp',
            'requestGroupId',
          ]);

          const propsToAdd = propsToKeep.find(
            (prop) =>
              prop.type === 'ObjectProperty' &&
              prop.key.type === 'Identifier' &&
              prop.key.name === 'storefrontHeaders',
          )
            ? []
            : [
                j.objectProperty(
                  j.stringLiteral('storefrontHeaders'),
                  j.callExpression(j.identifier('getStorefrontHeaders'), [
                    j.identifier('request'),
                  ]),
                ),
              ];

          arg.properties = [...propsToKeep, ...propsToAdd];
        });
      });

    return source.toSource();
  };
};

function removePropertiesFromObject(
  objectNode: ObjectExpression,
  propertyKeys: string[],
) {
  return objectNode.properties.filter((property) => {
    if (property.type !== 'ObjectProperty') {
      return [];
    }

    if (property.key.type !== 'Identifier') {
      return [];
    }
    return !propertyKeys.includes(property.key.name);
  });
}
