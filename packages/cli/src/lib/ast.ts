export type {SgNode} from '@ast-grep/napi';

export async function importLangAstGrep(lang: 'ts' | 'tsx' | 'js' | 'jsx') {
  // Delay CJS dependency import and binary import
  const astGrep = await import('@ast-grep/napi');

  if (!(lang in astGrep)) {
    throw new Error(`Wrong language for AST: ${lang}`);
  }

  return astGrep[lang];
}
