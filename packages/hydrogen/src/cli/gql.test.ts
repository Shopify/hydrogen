import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, win32 } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { checkGraphQL, getSchemaDirectory } from "./gql";

const TSCONFIG_PATH_ARGUMENT_INDEX = 3;
const tempDirectories: string[] = [];

function createTempDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), "hydrogen-gql-test-"));
  tempDirectories.push(directory);
  return directory;
}

afterEach(() => {
  for (const directory of tempDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("checkGraphQL", () => {
  it("runs gql.tada check with Hydrogen schemas and cleans up its temporary config", async () => {
    const cwd = createTempDirectory();
    const packageRoot = createTempDirectory();
    const tsconfigPath = join(cwd, "tsconfig.json");
    const gqlTadaCliPath = join(packageRoot, "node_modules/gql.tada/bin/cli.js");
    let didRunCommand = false;
    let temporaryTsconfigPath = "";

    writeFileSync(tsconfigPath, JSON.stringify({ compilerOptions: { strict: true } }));
    mkdirSync(join(packageRoot, "dist"));

    await checkGraphQL({
      args: ["--fail-on-warn", "--level", "warn"],
      cwd,
      gqlTadaCliPath,
      packageRoot,
      runCommand: async (command, args, options) => {
        didRunCommand = true;
        temporaryTsconfigPath = args[TSCONFIG_PATH_ARGUMENT_INDEX];
        expect(command).toBe(process.execPath);
        expect(options).toEqual({ cwd });
        expect(args).toEqual([
          gqlTadaCliPath,
          "check",
          "--tsconfig",
          temporaryTsconfigPath,
          "--level",
          "warn",
          "--fail-on-warn",
        ]);
        expect(JSON.parse(readFileSync(temporaryTsconfigPath, "utf8"))).toEqual({
          extends: tsconfigPath,
          compilerOptions: {
            plugins: [
              {
                name: "gql.tada/ts-plugin",
                schemas: [
                  {
                    name: "storefront",
                    schema: join(
                      relative(dirname(temporaryTsconfigPath), join(packageRoot, "dist")),
                      "storefront.schema.json",
                    ),
                    tadaOutputLocation: "storefront-graphql-env.d.ts",
                  },
                  {
                    name: "customer-account",
                    schema: join(
                      relative(dirname(temporaryTsconfigPath), join(packageRoot, "dist")),
                      "customer-account.schema.json",
                    ),
                    tadaOutputLocation: "customer-account-graphql-env.d.ts",
                  },
                ],
                trackFieldUsage: false,
              },
            ],
          },
        });
      },
    });

    expect(didRunCommand).toBe(true);
    expect(existsSync(temporaryTsconfigPath)).toBe(false);
  });

  it("accepts a custom tsconfig path", async () => {
    const cwd = createTempDirectory();
    const packageRoot = createTempDirectory();
    const configuredTsconfigPath = join(cwd, "config/tsconfig.app.json");
    const gqlTadaCliPath = join(packageRoot, "gql-tada.js");
    let didRunCommand = false;
    mkdirSync(join(cwd, "config"));
    mkdirSync(join(packageRoot, "dist"));
    writeFileSync(configuredTsconfigPath, "{}");

    await checkGraphQL({
      args: ["--tsconfig", "config/tsconfig.app.json"],
      cwd,
      gqlTadaCliPath,
      packageRoot,
      runCommand: async (_command, args) => {
        didRunCommand = true;
        const shadowConfig = JSON.parse(readFileSync(args[TSCONFIG_PATH_ARGUMENT_INDEX], "utf8"));
        expect(shadowConfig.extends).toBe(configuredTsconfigPath);
      },
    });

    expect(didRunCommand).toBe(true);
  });

  it("rejects unknown diagnostic levels", async () => {
    await expect(checkGraphQL({ args: ["--level", "verbose"] })).rejects.toThrow(
      "Invalid diagnostic level: verbose",
    );
  });
});

function isUrl(value: string): boolean {
  return URL.canParse(value);
}

describe("getSchemaDirectory (Windows paths)", () => {
  it("documents why absolute Windows paths are a problem", () => {
    expect(isUrl("C:\\pkg\\dist\\storefront.schema.json")).toBe(true);
  });

  it("returns a backslash relative path that gql.tada will not treat as a URL (same drive)", () => {
    const result = getSchemaDirectory(
      "C:\\proj\\app\\.hydrogen-gql-1.json",
      "C:\\proj\\node_modules\\@shopify\\hydrogen",
      win32,
    );

    expect(result).toBe("..\\node_modules\\@shopify\\hydrogen\\dist");
    expect(win32.isAbsolute(result)).toBe(false);
    expect(isUrl(win32.join(result, "storefront.schema.json"))).toBe(false);
  });

  it("is case-insensitive about the drive letter", () => {
    const result = getSchemaDirectory("c:\\proj\\.t.json", "C:\\pkg", win32);
    expect(win32.isAbsolute(result)).toBe(false);
  });

  it("KNOWN LIMITATION: stays absolute when the project and package are on different drives", () => {
    const result = getSchemaDirectory("D:\\proj\\.t.json", "C:\\pkg", win32);

    expect(result).toBe("C:\\pkg\\dist");
    expect(win32.isAbsolute(result)).toBe(true);
    expect(isUrl(win32.join(result, "storefront.schema.json"))).toBe(true);
  });

  it("returns a relative POSIX path on POSIX", () => {
    const result = getSchemaDirectory("/proj/.t.json", "/pkg");
    expect(isAbsolute(result)).toBe(false);
  });
});
