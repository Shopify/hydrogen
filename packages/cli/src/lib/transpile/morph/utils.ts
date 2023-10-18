import type {JSDoc, JSDocableNode} from 'ts-morph';

/** Get JSDoc for a node or create one if there isn't any */
export function getJsDocOrCreate(node: JSDocableNode): JSDoc {
  return node.getJsDocs().at(-1) || node.addJsDoc({description: '\n'});
}

/** Sanitize a string to use as a type in a doc comment so that it is compatible with JSDoc */
export function sanitizeType<T extends string | undefined>(str: T) {
  if (!str) return str;
  // Convert `typeof MyClass` syntax to `Class<MyClass>`
  const extractedClassFromTypeof = /{*typeof\s+([^(?:}|\s);]*)/gm.exec(
    str,
  )?.[1];

  if (!extractedClassFromTypeof) return str;

  return `Class<${extractedClassFromTypeof}>`;
}
