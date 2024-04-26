async function transpileFile(code, filepath, keepTypes = true) {
  const { transpileTs } = await import('./morph/index.js');
  return transpileTs(code, filepath, keepTypes);
}

export { transpileFile };
