import type {Transform} from './transform.js';

import {Collection, ExportNamedDeclaration, JSCodeshift} from 'jscodeshift';

export function findLoaderFunction(
  j: JSCodeshift,
  source: Parameters<Transform>[1],
): Collection<ExportNamedDeclaration> {
  return source.find(j.ExportNamedDeclaration, {
    declaration: {
      type: 'FunctionDeclaration',
      id: {
        name: 'loader',
      },
    },
  });
}
