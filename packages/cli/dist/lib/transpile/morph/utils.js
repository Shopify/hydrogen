function getJsDocOrCreate(node) {
  return node.getJsDocs().at(-1) || node.addJsDoc({ description: "\n" });
}
function sanitizeType(str) {
  if (!str)
    return str;
  const extractedClassFromTypeof = /{*typeof\s+([^(?:}|\s);]*)/gm.exec(
    str
  )?.[1];
  if (!extractedClassFromTypeof)
    return str;
  return `Class<${extractedClassFromTypeof}>`;
}

export { getJsDocOrCreate, sanitizeType };
