import { basename, dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const hydrogenRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const scriptImportPromises = new Map<string, Promise<string>>();
const scriptImportPattern =
  /import\s+([A-Za-z_$][\w$]*)\s+from\s+["']([^"']+)["']\s+with\s*\{\s*type\s*:\s*["']script["']\s*\}\s*;?/g;
const SCRIPT_DATA_PLACEHOLDER = "__SHOPIFY_SCRIPT_DATA__";
const SCRIPT_SERIALIZER = [
  '(JSON.stringify(scriptData) ?? "undefined")',
  '.replace(/</g, "\\\\u003c")',
  '.replace(/\\u2028/g, "\\\\u2028")',
  '.replace(/\\u2029/g, "\\\\u2029")',
].join("");

type InlineScriptImportsOptions = {
  version: string;
};

export function inlineScriptImports({ version }: InlineScriptImportsOptions) {
  return {
    name: "inline-script-imports",
    enforce: "pre" as const,
    async transform(code: string, id: string) {
      const replacements: Array<{ start: number; end: number; value: string }> = [];
      for (const match of code.matchAll(scriptImportPattern)) {
        const [statement, variableName, importPath] = match;
        const start = match.index;
        if (start === undefined) continue;

        const entry = resolve(dirname(id.split("?")[0] ?? id), importPath);
        const script = await getInlineScript({ entry, version });
        replacements.push({
          start,
          end: start + statement.length,
          value: `const ${variableName} = (scriptData) => (${serializeScriptExpression(script)}).replace("${SCRIPT_DATA_PLACEHOLDER}", () => ${SCRIPT_SERIALIZER});`,
        });
      }

      if (replacements.length === 0) return;

      let nextCode = code;
      for (const replacement of replacements.reverse()) {
        nextCode =
          nextCode.slice(0, replacement.start) +
          replacement.value +
          nextCode.slice(replacement.end);
      }

      return nextCode;
    },
    watchChange() {
      scriptImportPromises.clear();
    },
  };
}

function serializeScriptExpression(script: string) {
  // Keep raw template tokens out of the generated package module. The built
  // inline scripts can contain backticks and `${...}` sequences, which are safe
  // inside a JS string but can be reparsed by downstream SSR transforms as raw
  // source. Percent-encoding avoids that parser ambiguity while preserving the
  // exact inline script after decodeURIComponent runs at runtime.
  return `decodeURIComponent(${JSON.stringify(encodeURIComponent(script))})`;
}

type InlineScriptBuildOptions = {
  entry: string;
  version: string;
};

function getInlineScript(options: InlineScriptBuildOptions) {
  const key = `${options.version}:${options.entry}`;
  let scriptPromise = scriptImportPromises.get(key);
  if (!scriptPromise) {
    scriptPromise = buildInlineScript(options);
    scriptPromise.catch(() => scriptImportPromises.delete(key));
    scriptImportPromises.set(key, scriptPromise);
  }

  return scriptPromise;
}

async function buildInlineScript({ entry, version }: InlineScriptBuildOptions) {
  const { build } = await import("tsdown");
  const virtualModuleId = `\0hydrogen-inline-script:${entry}`;
  const entryName = basename(entry, extname(entry));
  const bundles = await build({
    config: false,
    cwd: hydrogenRoot,
    entry: { [entryName]: virtualModuleId },
    format: "iife",
    globalName: "HydrogenInlineScript",
    outDir: "dist/.virtual",
    dts: false,
    hash: false,
    minify: true,
    sourcemap: false,
    clean: false,
    platform: "browser",
    write: false,
    define: {
      __HYDROGEN_VERSION__: JSON.stringify(version),
      __DEV__: "false",
    },
    plugins: [
      {
        name: "hydrogen-inline-script-entry",
        resolveId(id) {
          if (id === virtualModuleId) return id;
        },
        load(id) {
          if (id === virtualModuleId) {
            return `import script from ${JSON.stringify(entry)};\nscript(${SCRIPT_DATA_PLACEHOLDER});`;
          }
        },
      },
    ],
  });

  const bundleChunk = bundles
    .flatMap(({ chunks }) => chunks)
    .find((chunk) => chunk.type === "chunk");

  if (!bundleChunk) {
    throw new Error(`Failed to build inline script import for ${entry}.`);
  }

  return bundleChunk.code;
}
