/**
 * Note: An important portion of this code for generating JSDocs
 * originally comes from https://github.com/futurGH/ts-to-jsdoc
 */

import {Node, Project, ScriptTarget, SyntaxKind, ts} from 'ts-morph';
import {generateClassDocumentation} from './classes.js';
import {generateFunctionDocumentation} from './functions.js';
import {generateTypeDefs} from './typedefs.js';

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

/**
 * @license MIT (https://github.com/futurGH/ts-to-jsdoc/blob/67b5e548a30b9cb5bf74f200168ffddab9d8600e/LICENSE)
 * Copyright (c) 2021 futurGH
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
