import { ScriptTarget, ts, Project, SyntaxKind, Node } from 'ts-morph';
import { generateClassDocumentation } from './classes.js';
import { generateFunctionDocumentation } from './functions.js';
import { generateTypeDefs } from './typedefs.js';

const DEFAULT_COMPILER_OPTIONS = {
  target: ScriptTarget.ESNext,
  esModuleInterop: true,
  jsx: ts.JsxEmit.Preserve,
  removeComments: false,
  lib: ["DOM", "DOM.Iterable", "ES2022"]
};
function transpileTs(src, filepath, addJsDoc) {
  return addJsDoc ? transpileTsWithJSDocs(src, filepath, DEFAULT_COMPILER_OPTIONS) : restoreCode(
    ts.transpileModule(escapeCode(src), {
      reportDiagnostics: false,
      compilerOptions: DEFAULT_COMPILER_OPTIONS
    }).outputText
  );
}
const BLANK_LINE_MARKER = "// BLANK_LINE_MARKER //";
const COMMENT_PROTECTOR_HEADER = "const __COMMENT_PROTECTOR_HEADER = 1;\n";
function escapeCode(code) {
  code = COMMENT_PROTECTOR_HEADER + code;
  return code.split("\n").map((line) => line.match(/^[\s\t]*$/) ? BLANK_LINE_MARKER + line : line).join("\n");
}
function restoreCode(code) {
  return code.replace(COMMENT_PROTECTOR_HEADER, "").split("\n").map((rawLine) => {
    const line = rawLine.trim();
    return line.startsWith(BLANK_LINE_MARKER) ? line.slice(BLANK_LINE_MARKER.length) : rawLine;
  }).join("\n").trim();
}
function transpileTsWithJSDocs(src, filepath, compilerOptions = {}) {
  const project = new Project({
    useInMemoryFileSystem: true,
    skipAddingFilesFromTsConfig: true,
    skipFileDependencyResolution: false,
    compilerOptions
  });
  const sourceFile = project.createSourceFile(filepath, escapeCode(src));
  sourceFile.getClasses().forEach(generateClassDocumentation);
  sourceFile.getFunctions().forEach((node) => generateFunctionDocumentation(node));
  sourceFile.getVariableDeclarations().forEach((varDeclaration) => {
    const initializer = varDeclaration.getInitializerIfKind(SyntaxKind.ArrowFunction) || varDeclaration.getInitializerIfKind(SyntaxKind.FunctionExpression);
    if (!initializer)
      return void 0;
    generateFunctionDocumentation(
      initializer,
      varDeclaration.getVariableStatement()
    );
  });
  sourceFile.getDefaultExportSymbol()?.getValueDeclaration()?.getChildren()?.find(Node.isObjectLiteralExpression)?.forEachChild((child) => {
    if (Node.isFunctionLikeDeclaration(child)) {
      generateFunctionDocumentation(child);
    }
  });
  let result = project.emitToMemory()?.getFiles()?.find(
    (file) => file.filePath.slice(0, -3) === sourceFile.getFilePath().slice(0, -3)
  )?.text;
  if (!result)
    throw new Error("Could not emit output to memory.");
  result = restoreCode(result);
  result = generateTypeDefs(sourceFile, result);
  return result.replace(/^\s*\/\*[*\s]+\*\/$\n/gm, "\n").trim() + "\n";
}

export { DEFAULT_COMPILER_OPTIONS, transpileTs };
