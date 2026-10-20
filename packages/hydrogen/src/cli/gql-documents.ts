import { readFileSync } from "node:fs";

import { parseSync } from "oxc-parser";

import type { SourceProject } from "./tsconfig";

export type GraphQLApi = "storefront" | "customer-account";

const GQL_EXPORT_NAME = "gql";
const HYDROGEN_PACKAGE_NAME = "@shopify/hydrogen";
const GQL_MODULES: Record<string, GraphQLApi> = {
  [HYDROGEN_PACKAGE_NAME]: "storefront",
  [`${HYDROGEN_PACKAGE_NAME}/customer-account`]: "customer-account",
};
const TRANSPARENT_WRAPPERS = new Set([
  "ParenthesizedExpression",
  "TSAsExpression",
  "TSSatisfiesExpression",
  "TSNonNullExpression",
  "TSTypeAssertion",
]);
const DEFAULT_EXPORT_NAME = "default";
const STRING_DELIMITER_LENGTH = 1;
// TypeScript with `allowJs` accepts JSX in .js files, and JSX parsing accepts all other JavaScript.
const JS_FILE_PATTERN = /\.[cm]?jsx?$/;
const UNREADABLE_PREFIX = "Could not read this gql() document statically";

export interface SourceLocation {
  file: string;
  /** Offset in the file, in UTF-16 code units. */
  offset: number;
}

export interface Diagnostic extends SourceLocation {
  severity: "error" | "warn";
  message: string;
}

/** A slice of query text and where it starts in its source file. */
interface DocumentPart extends SourceLocation {
  text: string;
  /** The same text as written in the file, before escapes and line endings are normalized. */
  sourceText: string;
}

/** The query text that a `gql()` call returns at runtime, as the parts it joins with newlines. */
export interface GraphQLDocument extends SourceLocation {
  api: GraphQLApi;
  parts: DocumentPart[];
}

interface Node {
  type: string;
  start: number;
  end: number;
  [key: string]: unknown;
}

type ExportTarget = { local: string } | { specifier: string; imported: string };

interface ModuleInfo {
  file: string;
  code: string;
  program: unknown;
  gqlFunctions: Map<string, GraphQLApi>;
  gqlNamespaces: Map<string, GraphQLApi>;
  constants: Map<string, Node>;
  imports: Map<string, { specifier: string; imported: string }>;
  exports: Map<string, ExportTarget>;
  starExports: string[];
}

type Evaluation =
  | { ok: true; parts: DocumentPart[]; api?: GraphQLApi }
  | { ok: false; diagnostic: Diagnostic };

function unreadable(reason: string, node: Node, module: ModuleInfo): Evaluation {
  return {
    ok: false,
    diagnostic: {
      file: module.file,
      offset: node.start,
      severity: "warn",
      message: `${UNREADABLE_PREFIX}: ${reason}.`,
    },
  };
}

function isNode(value: unknown): value is Node {
  return (
    typeof value === "object" && value !== null && typeof Reflect.get(value, "type") === "string"
  );
}

function child(node: Node, key: string): Node | undefined {
  const value = node[key];
  return isNode(value) ? value : undefined;
}

function children(node: Node, key: string): Node[] {
  const value = node[key];
  return Array.isArray(value) ? value.filter(isNode) : [];
}

function nameOf(node: Node | undefined): string | undefined {
  if (!node) return undefined;
  if (node.type === "Identifier" && typeof node.name === "string") return node.name;
  if (node.type === "Literal" && typeof node.value === "string") return node.value;
  return undefined;
}

function* walk(value: unknown): Generator<Node> {
  if (Array.isArray(value)) {
    for (const item of value) yield* walk(item);
    return;
  }
  if (!isNode(value)) return;
  yield value;
  for (const key in value) {
    if (key !== "parent") yield* walk(value[key]);
  }
}

function unwrap(node: Node): Node {
  let current = node;
  while (TRANSPARENT_WRAPPERS.has(current.type)) {
    const inner = child(current, "expression");
    if (!inner) break;
    current = inner;
  }
  return current;
}

function collectDeclarations(declaration: Node, module: ModuleInfo, exported: boolean) {
  if (declaration.type !== "VariableDeclaration" || declaration.kind !== "const") return;
  for (const declarator of children(declaration, "declarations")) {
    const name = nameOf(child(declarator, "id"));
    const init = child(declarator, "init");
    if (!name || !init) continue;
    module.constants.set(name, init);
    if (exported) module.exports.set(name, { local: name });
  }
}

function specifierOf(statement: Node): string | undefined {
  const source = child(statement, "source");
  return typeof source?.value === "string" ? source.value : undefined;
}

function collectImportSpecifier(
  importSpecifier: Node,
  specifier: string,
  api: GraphQLApi | undefined,
  module: ModuleInfo,
) {
  const local = nameOf(child(importSpecifier, "local"));
  if (!local || importSpecifier.importKind === "type") return;
  if (importSpecifier.type === "ImportNamespaceSpecifier") {
    if (api) module.gqlNamespaces.set(local, api);
    return;
  }
  const imported =
    importSpecifier.type === "ImportDefaultSpecifier"
      ? DEFAULT_EXPORT_NAME
      : nameOf(child(importSpecifier, "imported"));
  if (!imported) return;
  if (!api) module.imports.set(local, { specifier, imported });
  else if (imported === GQL_EXPORT_NAME) module.gqlFunctions.set(local, api);
}

function collectImport(statement: Node, module: ModuleInfo) {
  const specifier = specifierOf(statement);
  if (!specifier || statement.importKind === "type") return;
  for (const importSpecifier of children(statement, "specifiers")) {
    collectImportSpecifier(importSpecifier, specifier, GQL_MODULES[specifier], module);
  }
}

function collectNamedExport(statement: Node, module: ModuleInfo) {
  const specifier = specifierOf(statement);
  const declaration = child(statement, "declaration");
  if (declaration) collectDeclarations(declaration, module, true);
  for (const exportSpecifier of children(statement, "specifiers")) {
    const local = nameOf(child(exportSpecifier, "local"));
    const exportedName = nameOf(child(exportSpecifier, "exported"));
    if (!local || !exportedName) continue;
    module.exports.set(exportedName, specifier ? { specifier, imported: local } : { local });
  }
}

function collectDefaultExport(statement: Node, module: ModuleInfo) {
  const declaration = child(statement, "declaration");
  if (declaration) module.constants.set(DEFAULT_EXPORT_NAME, declaration);
  module.exports.set(DEFAULT_EXPORT_NAME, { local: DEFAULT_EXPORT_NAME });
}

function collectStarExport(statement: Node, module: ModuleInfo) {
  const specifier = specifierOf(statement);
  if (specifier && !child(statement, "exported")) module.starExports.push(specifier);
}

const STATEMENT_COLLECTORS: Record<string, (statement: Node, module: ModuleInfo) => void> = {
  ImportDeclaration: collectImport,
  VariableDeclaration: (statement, module) => collectDeclarations(statement, module, false),
  ExportNamedDeclaration: collectNamedExport,
  ExportDefaultDeclaration: collectDefaultExport,
  ExportAllDeclaration: collectStarExport,
};

function stringPart(text: string, node: Node, module: ModuleInfo): DocumentPart {
  const offset = node.start + STRING_DELIMITER_LENGTH;
  return {
    text,
    sourceText: module.code.slice(offset, node.end - STRING_DELIMITER_LENGTH),
    file: module.file,
    offset,
  };
}

/** Reads a string literal or a template literal without `${}` expressions. */
function readStringNode(node: Node, module: ModuleInfo): Evaluation | undefined {
  if (node.type === "Literal" && typeof node.value === "string") {
    return { ok: true, parts: [stringPart(node.value, node, module)] };
  }

  if (node.type !== "TemplateLiteral") return undefined;
  const [quasi, ...otherQuasis] = children(node, "quasis");
  const value: unknown = quasi?.value;
  const cooked =
    typeof value === "object" && value !== null ? Reflect.get(value, "cooked") : undefined;
  if (otherQuasis.length > 0 || typeof cooked !== "string") {
    return unreadable("template literals with ${} expressions can't be read", node, module);
  }
  return { ok: true, parts: [stringPart(cooked, node, module)] };
}

/**
 * Maps an offset in a part's text to the file. Template literals normalize CRLF line endings to
 * LF, so each skipped `\r` shifts the offset. Other escapes map to the start of the string.
 */
export function getPartFileOffset(part: DocumentPart, position: number): number {
  if (part.sourceText === part.text) return part.offset + position;
  if (part.sourceText.replaceAll("\r\n", "\n") !== part.text) return part.offset;

  let textIndex = 0;
  let sourceIndex = 0;
  while (textIndex < position) {
    if (part.sourceText[sourceIndex] === "\r" && part.sourceText[sourceIndex + 1] === "\n") {
      sourceIndex++;
    }
    sourceIndex++;
    textIndex++;
  }
  return part.offset + sourceIndex;
}

export interface CollectedDocuments {
  documents: GraphQLDocument[];
  /** Warnings for documents the collector couldn't read statically. */
  diagnostics: Diagnostic[];
  /** Number of files that import a `gql` function. */
  files: number;
  /** Source text of a read file, for mapping offsets to lines. */
  getSource: (file: string) => string | undefined;
}

/**
 * Finds `gql()` calls imported from `@shopify/hydrogen` and `@shopify/hydrogen/customer-account`
 * and reads the query text each call produces at runtime, including fragments passed as the
 * second argument and fragments imported from other project files.
 */
export function collectGraphQLDocuments(project: SourceProject): CollectedDocuments {
  const collector = new GraphQLDocumentCollector(project);
  return { ...collector.collect(), getSource: (file) => collector.getSource(file) };
}

class GraphQLDocumentCollector {
  readonly #project: SourceProject;
  readonly #modules = new Map<string, ModuleInfo>();

  constructor(project: SourceProject) {
    this.#project = project;
  }

  getSource(file: string): string | undefined {
    return this.#modules.get(file)?.code;
  }

  collect(): Omit<CollectedDocuments, "getSource"> {
    const documents: GraphQLDocument[] = [];
    const diagnostics: Diagnostic[] = [];
    let files = 0;

    for (const file of this.#project.files) {
      const code = readFileSync(file, "utf8");
      // Most files never mention Hydrogen, so skip parsing them.
      if (!code.includes(HYDROGEN_PACKAGE_NAME)) continue;
      const module = this.#load(file, code);
      if (module.gqlFunctions.size === 0 && module.gqlNamespaces.size === 0) continue;
      files++;

      for (const node of walk(module.program)) {
        if (node.type !== "CallExpression") continue;
        const api = this.#gqlApi(node, module);
        if (!api) continue;
        const result = this.#evaluateCall(node, api, module, new Set());
        if (result.ok) {
          documents.push({ api, parts: result.parts, file, offset: node.start });
        } else {
          diagnostics.push(result.diagnostic);
        }
      }
    }

    return { documents, diagnostics, files };
  }

  #load(file: string, code = readFileSync(file, "utf8")): ModuleInfo {
    const cached = this.#modules.get(file);
    if (cached) return cached;

    const result = parseSync(file, code, JS_FILE_PATTERN.test(file) ? { lang: "jsx" } : undefined);
    const program: unknown = result.program;
    const module: ModuleInfo = {
      file,
      code,
      program,
      gqlFunctions: new Map(),
      gqlNamespaces: new Map(),
      constants: new Map(),
      imports: new Map(),
      exports: new Map(),
      starExports: [],
    };
    if (result.errors.length === 0 && isNode(program)) {
      for (const statement of children(program, "body")) {
        STATEMENT_COLLECTORS[statement.type]?.(statement, module);
      }
    }
    this.#modules.set(file, module);
    return module;
  }

  #gqlApi(call: Node, module: ModuleInfo): GraphQLApi | undefined {
    const callee = child(call, "callee");
    if (!callee) return undefined;
    if (callee.type === "Identifier") return module.gqlFunctions.get(nameOf(callee) ?? "");
    if (callee.type === "MemberExpression" && callee.computed !== true) {
      const namespace = nameOf(child(callee, "object"));
      const property = nameOf(child(callee, "property"));
      if (namespace && property === GQL_EXPORT_NAME) return module.gqlNamespaces.get(namespace);
    }
    return undefined;
  }

  #evaluateCall(
    call: Node,
    api: GraphQLApi,
    module: ModuleInfo,
    visiting: Set<string>,
  ): Evaluation {
    const [sourceArgument, fragmentsArgument, ...rest] = children(call, "arguments");
    if (!sourceArgument || rest.length > 0) {
      return unreadable("gql() takes query text and an optional fragments array", call, module);
    }
    const source = this.#evaluate(sourceArgument, module, visiting);
    if (!source.ok) return source;
    if (!fragmentsArgument) return { ...source, api };

    const fragments = unwrap(fragmentsArgument);
    if (fragments.type !== "ArrayExpression") {
      return unreadable("pass fragments as an array literal", fragmentsArgument, module);
    }

    const parts = [...source.parts];
    const seen = new Set<string>();
    for (const element of children(fragments, "elements")) {
      if (element.type === "SpreadElement") {
        return unreadable("spread fragment arrays can't be read", element, module);
      }
      const fragment = this.#evaluate(element, module, visiting);
      if (!fragment.ok) return fragment;
      if (!fragment.api) return unreadable("fragments must be gql() documents", element, module);
      // Matches the runtime gql(), which appends each distinct fragment text once.
      const text = fragment.parts.map((part) => part.text).join("\n");
      if (seen.has(text)) continue;
      seen.add(text);
      parts.push(...fragment.parts);
    }

    return { ok: true, parts, api };
  }

  #evaluate(expression: Node, module: ModuleInfo, visiting: Set<string>): Evaluation {
    const node = unwrap(expression);
    const text = readStringNode(node, module);
    if (text) return text;

    const api = node.type === "CallExpression" ? this.#gqlApi(node, module) : undefined;
    if (api) return this.#evaluateCall(node, api, module, visiting);
    if (node.type === "Identifier") {
      return this.#evaluateBinding(nameOf(node) ?? "", module, visiting, node);
    }
    return unreadable("only string literals and gql() documents can be read", node, module);
  }

  #evaluateBinding(
    name: string,
    module: ModuleInfo,
    visiting: Set<string>,
    reference: Node,
  ): Evaluation {
    const key = `${module.file}#${name}`;
    if (visiting.has(key)) return unreadable(`"${name}" refers to itself`, reference, module);
    const nextVisiting = new Set([...visiting, key]);

    const constant = module.constants.get(name);
    if (constant) return this.#evaluate(constant, module, nextVisiting);

    const imported = module.imports.get(name);
    if (!imported) {
      return unreadable(`"${name}" isn't a module-level const`, reference, module);
    }
    const target = this.#resolveExport(imported.specifier, imported.imported, module, new Set());
    const targetConstant = target?.module.constants.get(target.name);
    const targetKey = `${target?.module.file}#${target?.name}`;
    if (!target || !targetConstant || visiting.has(targetKey)) {
      return unreadable(
        `"${name}" can't be traced to a gql() document in "${imported.specifier}"`,
        reference,
        module,
      );
    }
    return this.#evaluate(targetConstant, target.module, new Set([...nextVisiting, targetKey]));
  }

  #resolveExport(
    specifier: string,
    exportName: string,
    importer: ModuleInfo,
    visited: Set<string>,
  ): { module: ModuleInfo; name: string } | undefined {
    const file = this.#project.resolveImport(specifier, importer.file);
    if (!file || visited.has(file)) return undefined;
    visited.add(file);
    const module = this.#load(file);

    const target = module.exports.get(exportName);
    if (target && "local" in target) {
      const reexport = module.imports.get(target.local);
      return reexport
        ? this.#resolveExport(reexport.specifier, reexport.imported, module, visited)
        : { module, name: target.local };
    }
    if (target) return this.#resolveExport(target.specifier, target.imported, module, visited);

    for (const starSpecifier of module.starExports) {
      const found = this.#resolveExport(starSpecifier, exportName, module, visited);
      if (found) return found;
    }
    return undefined;
  }
}
