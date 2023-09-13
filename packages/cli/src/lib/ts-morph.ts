import {Node, Project, ScriptTarget, SyntaxKind, ts} from 'ts-morph';

import type {
  ClassDeclaration,
  ClassMemberTypes,
  FunctionLikeDeclaration,
  InterfaceDeclaration,
  JSDoc,
  JSDocableNode,
  PropertyAssignment,
  PropertyDeclaration,
  PropertySignature,
  SourceFile,
  TypeAliasDeclaration,
  TypedNode,
  VariableStatement,
} from 'ts-morph';

export {ts};

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

/** Get JSDoc for a node or create one if there isn't any */
function getJsDocOrCreate(node: JSDocableNode): JSDoc {
  return node.getJsDocs().at(-1) || node.addJsDoc({description: '\n'});
}

/** Return the node most suitable for JSDoc for a function, adding JSDoc if there isn't any */
function getOutputJsDocNodeOrCreate(
  functionNode: FunctionLikeDeclaration,
  docNode?: JSDocableNode,
): JSDocableNode {
  if (docNode) {
    const funcNodeDocs = functionNode.getJsDocs();
    if (funcNodeDocs.length) return functionNode;
    getJsDocOrCreate(docNode);
    return docNode;
  }
  getJsDocOrCreate(functionNode);
  return functionNode;
}

/** Sanitize a string to use as a type in a doc comment so that it is compatible with JSDoc */
function sanitizeType<T extends string | undefined>(str: T) {
  if (!str) return str;
  // Convert `typeof MyClass` syntax to `Class<MyClass>`
  const extractedClassFromTypeof = /{*typeof\s+([^(?:}|\s);]*)/gm.exec(
    str,
  )?.[1];

  if (!extractedClassFromTypeof) return str;

  return `Class<${extractedClassFromTypeof}>`;
}

/**
 * Generate @param documentation from function parameters for functionNode, storing it in docNode
 */
function generateParameterDocumentation(
  functionNode: FunctionLikeDeclaration,
  docNode: JSDocableNode,
): void {
  const params = functionNode.getParameters();

  // Get param tag that matches the param
  const jsDoc = getJsDocOrCreate(docNode);
  const paramTags = (jsDoc.getTags() || []).filter((tag) =>
    ['param', 'parameter'].includes(tag.getTagName()),
  );
  const commentLookup = Object.fromEntries(
    paramTags.map((tag) => [
      // @ts-ignore
      tag.compilerNode.name
        ?.getText()
        .replace(/\[|\]|(=.*)/g, '')
        .trim(),
      (tag.getComment() || '').toString().trim(),
    ]),
  );
  const preferredTagName = paramTags[0]?.getTagName();
  paramTags.forEach((tag) => tag.remove());

  for (const param of params) {
    const paramType = sanitizeType(param.getTypeNode()?.getText());
    if (!paramType) continue;

    const paramName = param.compilerNode.name?.getText();
    const isOptional = param.isOptional();
    const isRest = param.isRestParameter();

    // Rest parameters are arrays, but the JSDoc syntax is `...number` instead of `number[]`
    const paramTypeOut = isRest
      ? `...${paramType.replace(/\[\]\s*$/, '')}`
      : paramType;

    let defaultValue: string | undefined;
    if (isOptional) {
      const paramInitializer = param.getInitializer();
      defaultValue = paramInitializer
        ?.getText()
        .replaceAll(/(\s|\t)*\n(\s|\t)*/g, ' ');
    }

    let paramNameOut = paramName;
    // Skip parameter names if they are present in the type as an object literal
    // e.g. destructuring; { a }: { a: string }
    if (paramNameOut.match(/[{},]/)) paramNameOut = '';
    if (paramNameOut && isOptional) {
      // Wrap name in square brackets if the parameter is optional
      const defaultValueOut =
        defaultValue !== undefined ? `=${defaultValue}` : '';
      paramNameOut = `[${paramNameOut}${defaultValueOut}]`;
    }
    paramNameOut = paramNameOut ? ` ${paramNameOut}` : '';

    const comment = commentLookup[paramName.trim()];

    jsDoc.addTag({
      tagName: preferredTagName || 'param',
      text: `{${paramTypeOut}}${paramNameOut}${comment ? ` ${comment}` : ''}`,
    });
  }
}

/**
 * Generate documentation for a function, storing it in functionNode or docNode
 */
function generateFunctionDocumentation(
  functionNode: FunctionLikeDeclaration,
  variableStatement?: VariableStatement,
): void {
  const outputDocNode = getOutputJsDocNodeOrCreate(
    functionNode,
    variableStatement,
  );

  generateParameterDocumentation(functionNode, outputDocNode);

  // Add type annotation to exported functions
  // using the `export const foo: Foo = () => {}` syntax
  const jsDocs = variableStatement?.getJsDocs()[0];
  if (jsDocs?.getTags().length === 0) {
    const declaration = variableStatement?.getDeclarations()[0];
    const type = declaration?.getType().getText();
    if (type && type !== 'any' && type !== 'unknown') {
      jsDocs.addTag({tagName: 'type', text: `{${type}}`});
    }
  }
}

/** Generate modifier documentation for class member */
function generateModifierDocumentation(classMember: ClassMemberTypes): void {
  if ('getModifiers' in classMember) {
    const modifiers = classMember.getModifiers() || [];
    for (const modifier of modifiers) {
      const text = modifier?.getText();
      if (
        ['public', 'private', 'protected', 'readonly', 'static'].includes(text)
      ) {
        const jsDoc = getJsDocOrCreate(classMember);
        jsDoc.addTag({tagName: text});
      }
    }
  }
}

/**
 * Add default value to class property documentation
 */
function generateClassPropertyDocumentation(
  classMember: ClassMemberTypes,
): void {
  const structure = classMember.getStructure();
  if (structure && 'initializer' in structure) {
    const initializer = structure.initializer;
    if (initializer && initializer !== 'undefined') {
      const jsDoc = getJsDocOrCreate(classMember);
      jsDoc.addTag({tagName: 'default', text: initializer});
    }
  }
}

/** Document the class itself; at the moment just its extends signature */
function generateClassBaseDocumentation(classNode: ClassDeclaration) {
  const jsDoc = getJsDocOrCreate(classNode);
  const extendedClass = classNode.getExtends();
  if (extendedClass) {
    jsDoc.addTag({tagName: 'extends', text: extendedClass.getText()});
  }
}

/** Generate documentation for class members in general; either property or method */
function generateClassMemberDocumentation(classMember: ClassMemberTypes): void {
  generateModifierDocumentation(classMember);

  if (
    Node.isPropertyDeclaration(classMember) ||
    Node.isPropertyAssignment(classMember) ||
    Node.isPropertySignature(classMember)
  ) {
    generateClassPropertyDocumentation(classMember);
  }

  if (
    Node.isMethodDeclaration(classMember) ||
    Node.isConstructorDeclaration(classMember)
  ) {
    generateFunctionDocumentation(classMember);
  }
}

/** Generate documentation for a class — itself and its members */
function generateClassDocumentation(classNode: ClassDeclaration): void {
  generateClassBaseDocumentation(classNode);
  classNode.getMembers().forEach(generateClassMemberDocumentation);
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

const BLANK_LINE_MARKER = '// BLANK_LINE_MARKER //';
const COMMENT_PROTECTOR_HEADER = 'const __COMMENT_PROTECTOR_HEADER = 1;\n';

function escapeCode(code: string) {
  code = COMMENT_PROTECTOR_HEADER + code;

  return code
    .split('\n')
    .map((line) => (line.match(/^[\s\t]*$/) ? BLANK_LINE_MARKER + line : line))
    .join('\n');
}

function restoreCode(code: string) {
  return code
    .replace(COMMENT_PROTECTOR_HEADER, '')
    .split('\n')
    .map((rawLine) => {
      const line = rawLine.trim();
      return line.startsWith(BLANK_LINE_MARKER)
        ? line.slice(BLANK_LINE_MARKER.length)
        : rawLine;
    })
    .join('\n')
    .trim();
}

export const DEFAULT_COMPILER_OPTIONS: ts.CompilerOptions = {
  target: ScriptTarget.ESNext,
  esModuleInterop: true,
  jsx: ts.JsxEmit.Preserve,
  removeComments: false,
  lib: ['DOM', 'DOM.Iterable', 'ES2022'],
};

export function transpileTs(src: string, filepath: string, addJsDoc: boolean) {
  return addJsDoc
    ? transpileTsWithJSDocs(src, filepath, DEFAULT_COMPILER_OPTIONS)
    : restoreCode(
        ts.transpileModule(escapeCode(src), {
          reportDiagnostics: false,
          compilerOptions: DEFAULT_COMPILER_OPTIONS,
        }).outputText,
      );
}

/**
 * Transpile.
 * @param src Source code to transpile
 * @param filename Filename to use internally when transpiling
 * @param [compilerOptions={}] Options for the compiler.
 * 		See https://www.typescriptlang.org/tsconfig#compilerOptions
 * @return Transpiled code (or the original source code if something went wrong)
 */
function transpileTsWithJSDocs(
  src: string,
  filepath: string,
  compilerOptions: ts.CompilerOptions = {},
): string {
  const project = new Project({
    useInMemoryFileSystem: true,
    skipAddingFilesFromTsConfig: true,
    skipFileDependencyResolution: false,
    compilerOptions,
  });

  const sourceFile = project.createSourceFile(filepath, escapeCode(src));

  // Annotate classes
  sourceFile.getClasses().forEach(generateClassDocumentation);

  // Annotate function signatures
  sourceFile
    .getFunctions()
    .forEach((node) => generateFunctionDocumentation(node));

  // Annotate variable declarations
  sourceFile.getVariableDeclarations().forEach((varDeclaration) => {
    const initializer =
      varDeclaration.getInitializerIfKind(SyntaxKind.ArrowFunction) ||
      varDeclaration.getInitializerIfKind(SyntaxKind.FunctionExpression);

    if (!initializer) return undefined; // not a function

    generateFunctionDocumentation(
      initializer,
      varDeclaration.getVariableStatement(),
    );
  });

  // Annotate default exported object properties like `fetch` in `server.js`
  sourceFile
    .getDefaultExportSymbol()
    ?.getValueDeclaration()
    ?.getChildren()
    ?.find(Node.isObjectLiteralExpression)
    ?.forEachChild((child) => {
      if (Node.isFunctionLikeDeclaration(child)) {
        generateFunctionDocumentation(child);
      }
    });

  let result = project
    .emitToMemory()
    ?.getFiles()
    ?.find(
      (file) =>
        file.filePath.slice(0, -3) === sourceFile.getFilePath().slice(0, -3),
    )?.text;

  if (!result) throw new Error('Could not emit output to memory.');

  // Restore blank lines in output
  result = restoreCode(result);

  // Add typedefs and type annotations
  result = generateTypeDefs(sourceFile, result);

  // Remove empty JSDocs
  return result.replace(/^\s*\/\*[*\s]+\*\/$\n/gm, '\n').trim() + '\n';
}

function generateTypeDefs(sourceFile: SourceFile, code: string) {
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
    .filter((imp) => imp.getText().includes(' type '));

  const typedefsFromImports = new Map<string, string[]>();

  for (const typeImport of typeImports) {
    const isFullType = typeImport.isTypeOnly();
    const typeElements = [] as string[];
    for (const namedImport of typeImport.getNamedImports()) {
      const text = namedImport.getText().trim();
      const isType = isFullType || text.startsWith('type ');
      if (isType) {
        typeElements.push(text.replace(/^type\s+/, ''));
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

  typedefsFromImports.forEach((typeElements, moduleSpecifier) => {
    for (const typeElement of typeElements) {
      typedefs.push(
        `/** @typedef {import('${moduleSpecifier}').${typeElement}} ${typeElement} */`,
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
