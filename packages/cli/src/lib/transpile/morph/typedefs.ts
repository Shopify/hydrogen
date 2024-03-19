import {Node} from 'ts-morph';

import type {
  InterfaceDeclaration,
  JSDoc,
  JSDocableNode,
  PropertyAssignment,
  PropertyDeclaration,
  PropertySignature,
  SourceFile,
  TypeAliasDeclaration,
  TypedNode,
} from 'ts-morph';

import {sanitizeType, getJsDocOrCreate} from './utils.js';

export function generateTypeDefs(sourceFile: SourceFile, code: string) {
  const typedefs = sourceFile
    .getTypeAliases()
    .map((typeAlias) =>
      generateTypedefDocumentation(typeAlias, sourceFile).trim(),
    )
    .concat(
      sourceFile
        .getInterfaces()
        .map((interfaceNode) =>
          generateInterfaceDocumentation(interfaceNode).trim(),
        ),
    );

  const typeImports = sourceFile
    .getImportDeclarations()
    .filter((imp) => /({|\s|\n)type\s/.test(imp.getText()));

  const typedefsFromImports = new Map<string, string[]>();

  for (const typeImport of typeImports) {
    const typeElements = [] as string[];
    const isFullType = typeImport.isTypeOnly();

    for (const namedImport of typeImport.getNamedImports()) {
      if (isFullType || namedImport.isTypeOnly()) {
        typeElements.push(namedImport.getName());
      }
    }

    if (typeElements.length > 0) {
      typedefsFromImports.set(
        typeImport.getModuleSpecifierValue(),
        typeElements,
      );
    }
  }

  typedefs.push(''); // New line

  const knownGenerics: Record<string, string | undefined> = {
    MetaFunction: 'T',
    Session: 'T,U',
    SessionStorage: 'T,U',
  };

  typedefsFromImports.forEach((typeElements, moduleSpecifier) => {
    for (const typeElement of typeElements) {
      // We only use this in root.tsx and it's better to
      // reuse the existing LoaderReturnData, so skip it.
      if (typeElement === 'SerializeFrom') continue;

      // Note: SerializeFrom also needs generic if we stop skipping it.
      const hasGeneric = !!knownGenerics[typeElement];

      typedefs.push(
        `/** ${
          hasGeneric ? `@template ${knownGenerics[typeElement]} ` : ''
        }@typedef {import('${moduleSpecifier}').${typeElement}${
          hasGeneric ? `<${knownGenerics[typeElement]}>` : ''
        }} ${typeElement} */`,
      );
    }
  });

  const filepath = sourceFile.getFilePath();
  if (filepath.includes('routes') || filepath.includes('root.')) {
    const source = sourceFile.getText();

    if (/(function loader\(|const loader =)/.test(source)) {
      typedefs.push(
        `/** @typedef {import('@shopify/remix-oxygen').SerializeFrom<typeof loader>} LoaderReturnData */`,
      );

      code = code.replace(
        /^\s+?const\s+([\w\d]+|\{[\w\d\s,.]+\})\s+?=\s+?useLoaderData\(\)/gms,
        '/** @type {LoaderReturnData} */\n$&',
      );
    }

    if (/(function action\(|const action =)/.test(source)) {
      typedefs.push(
        `/** @typedef {import('@shopify/remix-oxygen').SerializeFrom<typeof action>} ActionReturnData */`,
      );

      code = code.replace(
        /^\s+?const\s+([\w\d]+|\{[\w\d\s,.]+\})\s+?=\s+?useActionData\(\)/gms,
        '/** @type {ActionReturnData} */\n$&',
      );
    }
  }

  return code + `\n\n${typedefs.join('\n')}\n`;
}

/** Generate @typedefs from interfaces */
function generateInterfaceDocumentation(
  interfaceNode: InterfaceDeclaration,
): string {
  const name = interfaceNode.getName();
  const jsDoc = getJsDocOrCreate(interfaceNode);

  jsDoc.addTag({tagName: 'typedef', text: `{Object} ${name}`});
  interfaceNode.getProperties().forEach((prop) => {
    generateObjectPropertyDocumentation(prop, jsDoc);
  });

  return jsDoc.getFullText();
}

/**
 * Generate @typedefs from type aliases
 * @return A JSDoc comment containing the typedef
 */
function generateTypedefDocumentation(
  typeNode: TypeAliasDeclaration,
  sourceFile: SourceFile,
): string {
  // Create dummy node to assign typedef documentation to
  // (will be deleted afterwards)
  const name = typeNode.getName();
  let {type} = typeNode.getStructure();
  if (typeof type !== 'string') return '';

  type = sanitizeType(type);

  const dummyNode = sourceFile.addVariableStatement({
    declarations: [{name: `__dummy${name}`, initializer: 'null'}],
  });

  const typeParams = typeNode.getTypeParameters();
  const jsDoc = dummyNode
    .addJsDoc({
      tags: [
        {
          tagName: 'typedef',
          text: `{${type}} ${name}`,
        },
        ...typeParams.map((param) => {
          const constraint = param.getConstraint();
          const defaultType = param.getDefault();
          const paramName = param.getName();
          const nameWithDefault = defaultType
            ? `[${paramName}=${defaultType.getText()}]`
            : paramName;
          return {
            tagName: 'template',
            text: `${
              constraint ? `{${constraint.getText()}} ` : ''
            }${nameWithDefault}`,
          };
        }),
      ],
    })
    .getText();

  dummyNode.remove();

  return jsDoc;
}

type ObjectProperty = JSDocableNode &
  TypedNode &
  (PropertyDeclaration | PropertyAssignment | PropertySignature);

/** Get children for object node */
function getChildProperties(node: Node): ObjectProperty[] {
  const properties = node.getType().getProperties();

  const valueDeclarations = properties
    .map((child) => child.getValueDeclaration())
    // Hacky way to check if the child is actually a defined child in the interface
    // or if it's, e.g. a built-in method of the type (such as array.length)
    .filter((child) => node.getFullText().includes(child?.getFullText()!));

  return (valueDeclarations ?? []) as ObjectProperty[];
}

/**
 * Generate documentation for object properties; runs recursively for nested objects
 * @param node
 * @param jsDoc
 * @param [name=""] The name to assign child docs to;
 *		"obj" will generate docs for "obj.val1", "obj.val2", etc
 * @param [topLevelCall=true] recursive functions are funky
 */
function generateObjectPropertyDocumentation(
  node: ObjectProperty,
  jsDoc: JSDoc,
  name = '',
  topLevelCall = true,
): void {
  name = name || node.getName();
  if (!topLevelCall) name = `${name}.${node.getName()}`;
  let propType = node
    .getTypeNode()
    ?.getText()
    ?.replace(/\n/g, '')
    ?.replace(/\s/g, '');

  propType = sanitizeType(propType);

  const isOptional =
    node.hasQuestionToken() ||
    node
      .getJsDocs()?.[0]
      ?.getTags()
      ?.some((tag) => tag.getTagName() === 'optional');

  // Copy over existing description if there is one
  const existingPropDocs = node.getJsDocs()?.[0]?.getDescription() || '';
  const children = getChildProperties(node);

  if (children.length) propType = 'Object';

  jsDoc.addTag({
    tagName: 'property',
    text: `{${propType}} ${
      isOptional ? `[${name}]` : name
    } ${existingPropDocs}`,
  });

  if (children.length) {
    children.forEach((child) =>
      generateObjectPropertyDocumentation(child, jsDoc, name, false),
    );
  }
}
