import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, parse as parsePath, relative, resolve } from "node:path";
import { parseArgs } from "node:util";

import {
  buildClientSchema,
  GraphQLError,
  NoDeprecatedCustomRule,
  NoUnusedFragmentsRule,
  parse,
  specifiedRules,
  validate,
  type DocumentNode,
  type GraphQLSchema,
  type IntrospectionQuery,
} from "graphql";

import {
  collectGraphQLDocuments,
  getPartFileOffset,
  type Diagnostic,
  type GraphQLApi,
  type GraphQLDocument,
  type SourceLocation,
} from "./gql-documents";
import { loadSourceProject } from "./tsconfig";

const TSCONFIG_FILE_NAME = "tsconfig.json";
const SCHEMA_MODULES: Record<GraphQLApi, string> = {
  storefront: "@shopify/hydrogen/storefront.schema.json",
  "customer-account": "@shopify/hydrogen/customer-account.schema.json",
};
const SEVERITY_RANK = { info: 0, warn: 1, error: 2 } as const;
// A fragment document has no operation to spread its fragments into.
const ERROR_RULES = specifiedRules.filter((rule) => rule !== NoUnusedFragmentsRule);
const WARNING_RULES = [NoDeprecatedCustomRule];
const FIRST_LINE = 1;
const FIRST_COLUMN = 1;

type Severity = keyof typeof SEVERITY_RANK;

interface CheckGraphQLOptions {
  args?: string[];
}

function isSeverity(value: string): value is Severity {
  return value in SEVERITY_RANK;
}

function findTsconfig(cwd: string, configuredPath: string | undefined): string {
  if (configuredPath) return resolve(cwd, configuredPath);

  let directory = cwd;
  const root = parsePath(directory).root;
  while (directory !== root) {
    const candidate = join(directory, TSCONFIG_FILE_NAME);
    if (existsSync(candidate)) return candidate;
    directory = dirname(directory);
  }

  const rootCandidate = join(root, TSCONFIG_FILE_NAME);
  if (existsSync(rootCandidate)) return rootCandidate;
  throw new Error(`Could not find ${TSCONFIG_FILE_NAME}.`);
}

function parseCheckArgs(args: string[]) {
  const { values } = parseArgs({
    args,
    options: {
      "fail-on-warn": { type: "boolean", short: "w", default: false },
      level: { type: "string", short: "l", default: "info" },
      tsconfig: { type: "string", short: "c" },
    },
    strict: true,
  });

  if (!isSeverity(values.level)) {
    throw new Error(`Invalid diagnostic level: ${values.level}`);
  }

  return { ...values, level: values.level };
}

function loadSchema(api: GraphQLApi): GraphQLSchema {
  const schemaPath = createRequire(import.meta.url).resolve(SCHEMA_MODULES[api]);
  const json: unknown = JSON.parse(readFileSync(schemaPath, "utf8"));
  const introspection =
    typeof json === "object" && json !== null && "data" in json ? json.data : json;
  // oxlint-disable-next-line typescript-eslint/consistent-type-assertions -- The schema files are generated introspection results that ship with this package.
  return buildClientSchema(introspection as IntrospectionQuery);
}

/** Maps a position in the joined query text back to the source file that holds it. */
function locate(document: GraphQLDocument, position: number | undefined): SourceLocation {
  if (position === undefined) return { file: document.file, offset: document.offset };

  let partStart = 0;
  for (const part of document.parts) {
    const partEnd = partStart + part.text.length;
    if (position <= partEnd) {
      return { file: part.file, offset: getPartFileOffset(part, position - partStart) };
    }
    partStart = partEnd + "\n".length;
  }
  return { file: document.file, offset: document.offset };
}

function validateDocument(document: GraphQLDocument, schema: GraphQLSchema): Diagnostic[] {
  const text = document.parts.map((part) => part.text).join("\n");
  const toDiagnostic = (severity: Diagnostic["severity"], error: GraphQLError): Diagnostic => ({
    ...locate(document, error.positions?.[0]),
    severity,
    message: error.message,
  });

  let ast: DocumentNode;
  try {
    ast = parse(text);
  } catch (error) {
    if (error instanceof GraphQLError) return [toDiagnostic("error", error)];
    throw error;
  }

  return [
    ...validate(schema, ast, ERROR_RULES).map((error) => toDiagnostic("error", error)),
    ...validate(schema, ast, WARNING_RULES).map((error) => toDiagnostic("warn", error)),
  ];
}

function formatLocation(cwd: string, location: SourceLocation, source: string | undefined): string {
  const before = (source ?? "").slice(0, location.offset);
  const lineStart = before.lastIndexOf("\n") + 1;
  const line = before.split("\n").length - 1 + FIRST_LINE;
  const column = location.offset - lineStart + FIRST_COLUMN;
  return `${relative(cwd, location.file)}:${line}:${column}`;
}

function pluralize(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

/**
 * Validates every `gql()` document in a TypeScript project against the Storefront API and
 * Customer Account API schemas that ship with Hydrogen. Reads source files directly, so it works
 * with any TypeScript version, including TypeScript 7.
 */
export function checkGraphQL(options: CheckGraphQLOptions = {}): void {
  const cwd = process.cwd();
  const values = parseCheckArgs(options.args ?? []);
  const project = loadSourceProject(findTsconfig(cwd, values.tsconfig));
  const collected = collectGraphQLDocuments(project);
  const { documents, files, getSource } = collected;

  const schemas = new Map<GraphQLApi, GraphQLSchema>();
  const schemaFor = (api: GraphQLApi) => {
    const schema = schemas.get(api) ?? loadSchema(api);
    schemas.set(api, schema);
    return schema;
  };

  const diagnostics: Diagnostic[] = [
    ...collected.diagnostics,
    ...documents.flatMap((document) => validateDocument(document, schemaFor(document.api))),
  ];

  diagnostics.sort((a, b) => a.file.localeCompare(b.file) || a.offset - b.offset);
  const reported = new Set<string>();
  let errors = 0;
  let warnings = 0;
  for (const diagnostic of diagnostics) {
    if (SEVERITY_RANK[diagnostic.severity] < SEVERITY_RANK[values.level]) continue;
    const line = `${formatLocation(cwd, diagnostic, getSource(diagnostic.file))} - ${diagnostic.severity}: ${diagnostic.message}`;
    // A fragment shared by several documents reports each of its problems once.
    if (reported.has(line)) continue;
    reported.add(line);
    console.log(line);
    if (diagnostic.severity === "error") errors++;
    else warnings++;
  }

  const summary = `Validated ${pluralize(documents.length, "gql() document")} in ${pluralize(files, "file")}: ${pluralize(errors, "error")}, ${pluralize(warnings, "warning")}.`;
  if (errors > 0 || (values["fail-on-warn"] && warnings > 0)) throw new Error(summary);
  console.log(summary);
}
