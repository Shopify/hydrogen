import { getJsDocOrCreate, sanitizeType } from './utils.js';

function generateTypeDefs(sourceFile, code) {
  const typedefs = sourceFile.getTypeAliases().map(
    (typeAlias) => generateTypedefDocumentation(typeAlias, sourceFile).trim()
  ).concat(
    sourceFile.getInterfaces().map(
      (interfaceNode) => generateInterfaceDocumentation(interfaceNode).trim()
    )
  );
  const typeImports = sourceFile.getImportDeclarations().filter((imp) => /({|\s|\n)type\s/.test(imp.getText()));
  const typedefsFromImports = /* @__PURE__ */ new Map();
  for (const typeImport of typeImports) {
    const typeElements = [];
    const isFullType = typeImport.isTypeOnly();
    for (const namedImport of typeImport.getNamedImports()) {
      if (isFullType || namedImport.isTypeOnly()) {
        typeElements.push(namedImport.getName());
      }
    }
    if (typeElements.length > 0) {
      typedefsFromImports.set(
        typeImport.getModuleSpecifierValue(),
        typeElements
      );
    }
  }
  typedefs.push("");
  const knownGenerics = {
    MetaFunction: "T",
    SerializeFrom: "T"
  };
  typedefsFromImports.forEach((typeElements, moduleSpecifier) => {
    for (const typeElement of typeElements) {
      const hasGeneric = !!knownGenerics[typeElement];
      typedefs.push(
        `/** ${hasGeneric ? `@template ${knownGenerics[typeElement]} ` : ""}@typedef {import('${moduleSpecifier}').${typeElement}${hasGeneric ? `<${knownGenerics[typeElement]}>` : ""}} ${typeElement} */`
      );
    }
  });
  const filepath = sourceFile.getFilePath();
  if (filepath.includes("routes") || filepath.includes("root.")) {
    const source = sourceFile.getText();
    if (/RootLoader/.test(source)) {
      code = code.replace(
        /^\s+?const\s+([\w\d]+|\{[\w\d\s,.]+\})\s+?=\s+?useRouteLoaderData\(['"]root['"]\)/gms,
        "/** @type {RootLoader} */\n$&"
      );
    }
    if (/(function loader\(|const loader =)/.test(source)) {
      typedefs.push(
        `/** @typedef {import('@shopify/remix-oxygen').SerializeFrom<typeof loader>} LoaderReturnData */`
      );
      code = code.replace(
        /^\s+?const\s+([\w\d]+|\{[\w\d\s,.]+\})\s+?=\s+?useLoaderData\(\)/gms,
        "/** @type {LoaderReturnData} */\n$&"
      );
      if (/(function Layout\(|const Layout =)/.test(source) && filepath.includes("root.")) {
        const rootLoaderTypeDef = `/** @typedef {LoaderReturnData} RootLoader */`;
        const existingRootLoaderIndex = typedefs.findIndex(
          (t) => /RootLoader/.test(t)
        );
        if (existingRootLoaderIndex >= 0) {
          typedefs.splice(existingRootLoaderIndex, 1, rootLoaderTypeDef);
        } else {
          typedefs.push(rootLoaderTypeDef);
        }
      }
    }
    if (/(function action\(|const action =)/.test(source)) {
      typedefs.push(
        `/** @typedef {import('@shopify/remix-oxygen').SerializeFrom<typeof action>} ActionReturnData */`
      );
      code = code.replace(
        /^\s+?const\s+([\w\d]+|\{[\w\d\s,.]+\})\s+?=\s+?useActionData\(\)/gms,
        "/** @type {ActionReturnData} */\n$&"
      );
    }
  }
  return code + `

${typedefs.join("\n")}
`;
}
function generateInterfaceDocumentation(interfaceNode) {
  const name = interfaceNode.getName();
  const jsDoc = getJsDocOrCreate(interfaceNode);
  jsDoc.addTag({ tagName: "typedef", text: `{Object} ${name}` });
  interfaceNode.getProperties().forEach((prop) => {
    generateObjectPropertyDocumentation(prop, jsDoc);
  });
  return jsDoc.getFullText();
}
function generateTypedefDocumentation(typeNode, sourceFile) {
  const name = typeNode.getName();
  let { type } = typeNode.getStructure();
  if (typeof type !== "string") return "";
  type = sanitizeType(type);
  const dummyNode = sourceFile.addVariableStatement({
    declarations: [{ name: `__dummy${name}`, initializer: "null" }]
  });
  const typeParams = typeNode.getTypeParameters();
  const jsDoc = dummyNode.addJsDoc({
    tags: [
      {
        tagName: "typedef",
        text: `{${type}} ${name}`
      },
      ...typeParams.map((param) => {
        const constraint = param.getConstraint();
        const defaultType = param.getDefault();
        const paramName = param.getName();
        const nameWithDefault = defaultType ? `[${paramName}=${defaultType.getText()}]` : paramName;
        return {
          tagName: "template",
          text: `${constraint ? `{${constraint.getText()}} ` : ""}${nameWithDefault}`
        };
      })
    ]
  }).getText();
  dummyNode.remove();
  return jsDoc;
}
function getChildProperties(node) {
  const properties = node.getType().getProperties();
  const valueDeclarations = properties.map((child) => child.getValueDeclaration()).filter((child) => node.getFullText().includes(child?.getFullText()));
  return valueDeclarations ?? [];
}
function generateObjectPropertyDocumentation(node, jsDoc, name = "", topLevelCall = true) {
  name = name || node.getName();
  if (!topLevelCall) name = `${name}.${node.getName()}`;
  let propType = node.getTypeNode()?.getText()?.replace(/\n/g, "")?.replace(/\s/g, "");
  propType = sanitizeType(propType);
  const isOptional = node.hasQuestionToken() || node.getJsDocs()?.[0]?.getTags()?.some((tag) => tag.getTagName() === "optional");
  const existingPropDocs = node.getJsDocs()?.[0]?.getDescription() || "";
  const children = getChildProperties(node);
  if (children.length) propType = "Object";
  jsDoc.addTag({
    tagName: "property",
    text: `{${propType}} ${isOptional ? `[${name}]` : name} ${existingPropDocs}`
  });
  if (children.length) {
    children.forEach(
      (child) => generateObjectPropertyDocumentation(child, jsDoc, name, false)
    );
  }
}

export { generateTypeDefs };
