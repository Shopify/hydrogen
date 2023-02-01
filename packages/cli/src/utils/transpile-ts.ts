import path from 'path';
import prettier from 'prettier';
import ts, {type CompilerOptions} from 'typescript';

const escapeNewLines = (code: string) =>
  code.replace(/\n\n/g, '\n/* :newline: */');
const restoreNewLines = (code: string) =>
  code.replace(/\/\* :newline: \*\//g, '\n');

const DEFAULT_TS_CONFIG: Omit<CompilerOptions, 'target'> = {
  lib: ['DOM', 'DOM.Iterable', 'ES2022'],
  isolatedModules: true,
  esModuleInterop: true,
  resolveJsonModule: true,
  target: 'ES2022',
  strict: true,
  allowJs: true,
  forceConsistentCasingInFileNames: true,
  skipLibCheck: true,
};

export function transpileFile(code: string, config = DEFAULT_TS_CONFIG) {
  // We need to escape new lines in the template because TypeScript
  // will remove them when compiling.
  const withArtificialNewLines = escapeNewLines(code);

  // We compile the template to JavaScript.
  const compiled = ts.transpileModule(withArtificialNewLines, {
    reportDiagnostics: false,
    compilerOptions: {
      // '1' tells TypeScript to preserve the JSX syntax.
      jsx: 1,
      removeComments: false,
      ...config,
    },
  });

  // Here we restore the new lines that were removed by TypeScript.
  return restoreNewLines(compiled.outputText);
}

export async function format(content: string, filePath = '') {
  // Try to read a prettier config file from the project.
  const config =
    (await prettier.resolveConfig(filePath || process.cwd())) || {};

  const ext = path.extname(filePath);

  const formattedContent = prettier.format(content, {
    // Specify the TypeScript parser for ts/tsx files. Otherwise
    // we need to use the babel parser because the default parser
    // Otherwise prettier will print a warning.
    parser: ext === '.tsx' || ext === '.ts' ? 'typescript' : 'babel',
    ...config,
  });

  return formattedContent;
}
