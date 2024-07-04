async function importLangAstGrep(lang) {
  const astGrep = await import('@ast-grep/napi');
  if (!(lang in astGrep)) {
    throw new Error(`Wrong language for AST: ${lang}`);
  }
  return astGrep[lang];
}

export { importLangAstGrep };
