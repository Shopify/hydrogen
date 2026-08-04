import fs from "node:fs";
import path from "node:path";

import ts from "typescript";
import { describe, expect, it } from "vitest";

// Editor autocomplete regression tests for createStorefrontClient.
//
// `expectTypeOf` cannot catch these regressions: valid calls still typecheck.
// What breaks is contextual typing of *partial* input — while the user is
// still typing, TS resolves the object literal against the first overload
// instead of the full discriminated union, so completions degrade (e.g. only
// "public" is suggested for `type`, and private config suggests
// `publicStorefrontToken`). We assert on real language-service completions,
// the same API the editor uses.

const CURSOR = "/*cursor*/";
const packageRoot = path.resolve(__dirname, "../..");
const scratchPath = path.join(packageRoot, "src/client/__autocomplete-scratch__.ts");

function getCompletionsAt(sourceWithCursor: string): string[] {
  const cursorOffset = sourceWithCursor.indexOf(CURSOR);
  if (cursorOffset === -1) {
    throw new Error(`source must contain a ${CURSOR} marker`);
  }
  const scratchText = sourceWithCursor.replace(CURSOR, "");

  const configFile = ts.readConfigFile(path.join(packageRoot, "tsconfig.json"), ts.sys.readFile);
  const parsedConfig = ts.parseJsonConfigFileContent(configFile.config, ts.sys, packageRoot);

  const host: ts.LanguageServiceHost = {
    getScriptFileNames: () => [scratchPath],
    getScriptVersion: () => "1",
    getScriptSnapshot: (fileName) => {
      if (fileName === scratchPath) return ts.ScriptSnapshot.fromString(scratchText);
      if (!fs.existsSync(fileName)) return undefined;
      return ts.ScriptSnapshot.fromString(fs.readFileSync(fileName, "utf8"));
    },
    getCurrentDirectory: () => packageRoot,
    getCompilationSettings: () => parsedConfig.options,
    getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
    readDirectory: ts.sys.readDirectory,
    directoryExists: ts.sys.directoryExists,
    getDirectories: ts.sys.getDirectories,
  };

  const service = ts.createLanguageService(host, ts.createDocumentRegistry());
  try {
    const completions = service.getCompletionsAtPosition(scratchPath, cursorOffset, {});
    return completions?.entries.map((entry) => entry.name) ?? [];
  } finally {
    service.dispose();
  }
}

const SCRATCH_PRELUDE = `import { createStorefrontClient, createShopifyRequestContext } from "../core";

const requestContext = createShopifyRequestContext({
  request: { headers: new Headers() },
  i18n: { country: "US", language: "EN", pathPrefix: "" },
});
`;

describe("createStorefrontClient editor autocomplete", () => {
  it("suggests every client type for the `type` discriminant", () => {
    const completions = getCompletionsAt(`${SCRATCH_PRELUDE}
const storefrontClient = createStorefrontClient({
  type: "${CURSOR}",
});
`);

    expect(completions).toContain("public");
    expect(completions).toContain("private");
    expect(completions).toContain("private_no_buyer_context");
  });

  it("suggests private config keys once `type` is narrowed to private", () => {
    const completions = getCompletionsAt(`${SCRATCH_PRELUDE}
const storefrontClient = createStorefrontClient({
  type: "private",
  requestContext,
  config: { ${CURSOR} },
});
`);

    expect(completions).toContain("privateStorefrontToken");
    expect(completions).toContain("buyerIp");
    expect(completions).not.toContain("publicStorefrontToken");
  });
});
