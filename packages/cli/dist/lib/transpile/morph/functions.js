import { getJsDocOrCreate, sanitizeType } from './utils.js';

function generateFunctionDocumentation(functionNode, variableStatement) {
  const outputDocNode = getOutputJsDocNodeOrCreate(
    functionNode,
    variableStatement
  );
  generateParameterDocumentation(functionNode, outputDocNode);
  if (variableStatement) {
    const declaration = variableStatement?.getDeclarations()[0];
    const jsDocs = variableStatement?.getJsDocs()[0];
    if (jsDocs?.getTags().length === 0) {
      const type = declaration?.getType().getText();
      if (isAnnotableType(type)) {
        jsDocs.addTag({
          tagName: type.startsWith("() =>") ? "return" : "type",
          text: normalizeType(type)
        });
      }
    }
  } else {
    const declaration = functionNode;
    const jsDocs = declaration.getJsDocs()[0];
    if (jsDocs?.getTags().length === 0) {
      const returnType = declaration.getReturnType().getText();
      if (isAnnotableType(returnType)) {
        jsDocs.addTag({ tagName: "return", text: normalizeType(returnType) });
      }
    }
  }
}
function isAnnotableType(type) {
  return !!(type && type !== "any" && type !== "unknown" && type !== "{}" && type !== "boolean");
}
function normalizeType(type) {
  const normalizedType = type.replace(/^\(\)\s+=>\s+/, "").replace(/typeof import\("[^"]+"\)\./, "typeof ");
  return normalizedType === "SerializeFrom<any>" ? `{SerializeFrom<loader>}` : `{${normalizedType}}`;
}
function generateParameterDocumentation(functionNode, docNode) {
  const params = functionNode.getParameters();
  const jsDoc = getJsDocOrCreate(docNode);
  const paramTags = (jsDoc.getTags() || []).filter(
    (tag) => ["param", "parameter"].includes(tag.getTagName())
  );
  const commentLookup = Object.fromEntries(
    paramTags.map((tag) => [
      // @ts-ignore
      tag.compilerNode.name?.getText().replace(/\[|\]|(=.*)/g, "").trim(),
      (tag.getComment() || "").toString().trim()
    ])
  );
  const preferredTagName = paramTags[0]?.getTagName();
  paramTags.forEach((tag) => tag.remove());
  for (const param of params) {
    const paramType = sanitizeType(param.getTypeNode()?.getText());
    if (!paramType)
      continue;
    const paramName = param.compilerNode.name?.getText();
    const isOptional = param.isOptional();
    const isRest = param.isRestParameter();
    const paramTypeOut = isRest ? `...${paramType.replace(/\[\]\s*$/, "")}` : paramType;
    let defaultValue;
    if (isOptional) {
      const paramInitializer = param.getInitializer();
      defaultValue = paramInitializer?.getText().replaceAll(/(\s|\t)*\n(\s|\t)*/g, " ");
    }
    let paramNameOut = paramName;
    if (paramNameOut.match(/[{},]/))
      paramNameOut = "";
    if (paramNameOut && isOptional) {
      const defaultValueOut = defaultValue !== void 0 ? `=${defaultValue}` : "";
      paramNameOut = `[${paramNameOut}${defaultValueOut}]`;
    }
    paramNameOut = paramNameOut ? ` ${paramNameOut}` : "";
    const comment = commentLookup[paramName.trim()];
    jsDoc.addTag({
      tagName: preferredTagName || "param",
      text: `{${paramTypeOut}}${paramNameOut}${comment ? ` ${comment}` : ""}`
    });
  }
}
function getOutputJsDocNodeOrCreate(functionNode, docNode) {
  if (docNode) {
    const funcNodeDocs = functionNode.getJsDocs();
    if (funcNodeDocs.length)
      return functionNode;
    getJsDocOrCreate(docNode);
    return docNode;
  }
  getJsDocOrCreate(functionNode);
  return functionNode;
}

export { generateFunctionDocumentation };
