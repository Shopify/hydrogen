export async function transpileFile(
  code: string,
  filepath: string,
  keepTypes = true,
) {
  // This imports CJS dependencies. Do it dynamically
  // to avoid slowing down the CLI start-up time.
  const {transpileTs} = await import('./morph/index.js');
  //   if (!filepath.includes('root.') && !filepath.includes('server.')) return '';
  return transpileTs(code, filepath, keepTypes);
}
