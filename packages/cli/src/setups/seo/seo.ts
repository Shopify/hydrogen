import {JSCodeshift} from 'jscodeshift';

import type {JSXOpeningElement, ASTPath, JSXElement} from 'jscodeshift';
import {ui} from '@shopify/cli-kit';
import {parseGuide} from '../../utils/parse-guide.js';
import {runChangesets, type UpgradeOptions} from '../../utils/upgrades.js';
import type {Transform} from '../../utils/transform.js';
import {
  hasImportDeclaration,
  hasImportSpecifier,
  insertImportDeclaration,
  insertImportSpecifier,
} from '../../utils/imports.js';
import {hasChildJSXElement, insertChildJSXElement} from '../../utils/jsx.js';
import {findLoaderFunction} from '../../utils/remix.js';

export default async function seo(
  directory: string,
  options: UpgradeOptions = {},
) {
  const changes = parseGuide(import.meta.url);

  const tasks = ui.newListr(
    await runChangesets(
      directory,
      changes,
      [importSeoImport(), insertSeoComponent(), insertSeoLoaderData()],
      options,
    ),
  );

  return tasks;
}

export const importSeoImport = (): Transform => {
  return (j, source, sourcePath) => {
    if (!sourcePath.endsWith('root.jsx') && !sourcePath.endsWith('root.tsx')) {
      return source.toSource();
    }

    if (hasImportDeclaration(j, source, '@shopify/hydrogen')) {
      if (hasImportSpecifier(j, source, 'Seo', '@shopify/hydrogen')) {
        return source.toSource();
      }

      if (!hasImportSpecifier(j, source, 'Seo', '@shopify/hydrogen')) {
        insertImportSpecifier(j, source, 'Seo', '@shopify/hydrogen');
      }
    } else {
      insertImportDeclaration(
        j,
        source,
        'Seo',
        '@shopify/hydrogen',
        '@remix-run/react',
      );
    }

    return source.toSource();
  };
};

export const insertSeoComponent = (): Transform => {
  return (j, source, sourcePath) => {
    if (!sourcePath.endsWith('root.jsx') && !sourcePath.endsWith('root.tsx')) {
      return source.toSource();
    }

    source.findJSXElements('head').forEach((element) => {
      if (hasChildJSXElement(element, 'Seo')) {
        return;
      }

      insertChildJSXElement(j, element, 'Seo', 'start');
    });

    return source.toSource();
  };
};

export const insertSeoLoaderData = (): Transform => {
  return (j, source, sourcePath) => {
    if (!sourcePath.endsWith('root.ts') && !sourcePath.endsWith('root.tsx')) {
      return source.toSource();
    }

    const loaderFunction = findLoaderFunction(j, source);

    if (loaderFunction.length === 0) {
      return source.toSource();
    }

    loaderFunction.forEach((loader) => {
      const loaderBody =
        loader.value.declaration?.type === 'FunctionDeclaration'
          ? loader.value.declaration.body
          : j.blockStatement([]);

      if (seoLoaderData(j, loaderBody).length > 0) {
        return;
      }

      const loaderData = j.variableDeclaration('const', [
        j.variableDeclarator(j.identifier('seo'), j.objectExpression([])),
      ]);

      loaderBody.body.unshift(loaderData);

      const property = j.objectProperty(
        j.identifier('seo'),
        j.identifier('seo'),
      );
      property.shorthand = true;

      loaderBody.body.push(
        j.returnStatement(
          j.callExpression(j.identifier('defer'), [
            j.objectExpression([property]),
          ]),
        ),
      );
    });

    return source.toSource();
  };
};

function seoLoaderData(j: JSCodeshift, loaderBody: any) {
  return j(loaderBody).find(j.VariableDeclaration, {
    declarations: [
      {
        id: {
          name: 'seo',
        },
      },
    ],
  });
}
