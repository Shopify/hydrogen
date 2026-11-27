import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, isAbsolute, join, relative, win32 } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { checkGraphQL, getSchemaDirectory, getSchemaLocation } from "./gql";

const mockState = vi.hoisted(() => ({
  crossDrive: false,
  uuid: undefined as string | undefined,
}));

// `path.relative` returns the absolute target when the two paths are on different Windows
// drives. Doing the same here runs the schema copy branch on any platform.
vi.mock("node:path", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:path")>();
  return {
    ...actual,
    relative: (from: string, to: string) =>
      mockState.crossDrive ? actual.resolve(to) : actual.relative(from, to),
  };
});

vi.mock("node:crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:crypto")>();
  return { ...actual, randomUUID: () => mockState.uuid ?? actual.randomUUID() };
});

const TSCONFIG_PATH_ARGUMENT_INDEX = 3;
const SCHEMA_FILE_NAMES = ["storefront.schema.json", "customer-account.schema.json"];
const tempDirectories: string[] = [];

function createTempDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), "hydrogen-gql-test-"));
  tempDirectories.push(directory);
  return directory;
}

function createPackageRoot(schemaFileNames: string[] = SCHEMA_FILE_NAMES): string {
  const packageRoot = createTempDirectory();
  mkdirSync(join(packageRoot, "dist"));
  for (const fileName of schemaFileNames) {
    writeFileSync(join(packageRoot, "dist", fileName), `{"name":"${fileName}"}`);
  }
  return packageRoot;
}

function createProject(): string {
  const cwd = createTempDirectory();
  writeFileSync(join(cwd, "tsconfig.json"), "{}");
  return cwd;
}

afterEach(() => {
  mockState.crossDrive = false;
  mockState.uuid = undefined;
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

  it("does not remove a temporary tsconfig it did not create", async () => {
    const cwd = createProject();
    const packageRoot = createPackageRoot();
    const existingPath = join(cwd, ".hydrogen-gql-fixed.json");
    mockState.uuid = "fixed";
    writeFileSync(existingPath, "not ours");

    await expect(
      checkGraphQL({ cwd, packageRoot, gqlTadaCliPath: "gql-tada.js", runCommand: vi.fn() }),
    ).rejects.toThrow("EEXIST");

    expect(readFileSync(existingPath, "utf8")).toBe("not ours");
  });
});

describe("checkGraphQL across drives", () => {
  it("copies the schemas next to the temporary tsconfig and removes both afterwards", async () => {
    mockState.crossDrive = true;
    const cwd = createProject();
    const packageRoot = createPackageRoot();
    let temporaryTsconfigPath = "";
    let schemaDirectory = "";

    await checkGraphQL({
      cwd,
      packageRoot,
      gqlTadaCliPath: "gql-tada.js",
      runCommand: async (_command, args) => {
        temporaryTsconfigPath = args[TSCONFIG_PATH_ARGUMENT_INDEX];
        const config = JSON.parse(readFileSync(temporaryTsconfigPath, "utf8"));
        const schemas = config.compilerOptions.plugins[0].schemas;
        schemaDirectory = dirname(schemas[0].schema);

        expect(schemaDirectory).toBe(`${basename(temporaryTsconfigPath, ".json")}-schemas`);
        for (const schema of schemas) {
          expect(isAbsolute(schema.schema)).toBe(false);
          expect(readFileSync(join(cwd, schema.schema), "utf8")).toBe(
            `{"name":"${basename(schema.schema)}"}`,
          );
        }
      },
    });

    expect(temporaryTsconfigPath).not.toBe("");
    expect(existsSync(temporaryTsconfigPath)).toBe(false);
    expect(existsSync(join(cwd, schemaDirectory))).toBe(false);
  });

  it("removes the copied schemas when gql.tada fails", async () => {
    mockState.crossDrive = true;
    const cwd = createProject();
    const packageRoot = createPackageRoot();

    await expect(
      checkGraphQL({
        cwd,
        packageRoot,
        gqlTadaCliPath: "gql-tada.js",
        runCommand: async () => {
          expect(readdirSync(cwd)).toHaveLength(3);
          throw new Error("gql.tada failed");
        },
      }),
    ).rejects.toThrow("gql.tada failed");

    expect(readdirSync(cwd)).toEqual(["tsconfig.json"]);
  });

  it("removes a partially copied schema directory when a copy fails", async () => {
    mockState.crossDrive = true;
    const cwd = createProject();
    const packageRoot = createPackageRoot(SCHEMA_FILE_NAMES.slice(0, 1));
    const runCommand = vi.fn();

    await expect(
      checkGraphQL({ cwd, packageRoot, gqlTadaCliPath: "gql-tada.js", runCommand }),
    ).rejects.toThrow("ENOENT");

    expect(runCommand).not.toHaveBeenCalled();
    expect(readdirSync(cwd)).toEqual(["tsconfig.json"]);
  });

  it("does not remove a schema directory it did not create", async () => {
    mockState.crossDrive = true;
    mockState.uuid = "fixed";
    const cwd = createProject();
    const packageRoot = createPackageRoot();
    const existingDirectory = join(cwd, ".hydrogen-gql-fixed-schemas");
    const runCommand = vi.fn();
    mkdirSync(existingDirectory);
    writeFileSync(join(existingDirectory, "keep.txt"), "not ours");

    await expect(
      checkGraphQL({ cwd, packageRoot, gqlTadaCliPath: "gql-tada.js", runCommand }),
    ).rejects.toThrow("EEXIST");

    expect(runCommand).not.toHaveBeenCalled();
    expect(readFileSync(join(existingDirectory, "keep.txt"), "utf8")).toBe("not ours");
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

  it("stays absolute when the project and package are on different drives", () => {
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

describe("getSchemaLocation", () => {
  it("uses the package schemas in place when a relative path exists (same drive)", () => {
    const result = getSchemaLocation(
      "C:\\proj\\app\\.hydrogen-gql-1.json",
      "C:\\proj\\node_modules\\@shopify\\hydrogen",
      "C:\\proj\\app\\.hydrogen-gql-1-schemas",
      win32,
    );

    expect(result).toEqual({
      schemaDirectory: "..\\node_modules\\@shopify\\hydrogen\\dist",
      copySchemas: false,
    });
  });

  it("copies the schemas next to the temporary tsconfig across drives", () => {
    const result = getSchemaLocation(
      "D:\\proj\\.hydrogen-gql-1.json",
      "C:\\pkg",
      "D:\\proj\\.hydrogen-gql-1-schemas",
      win32,
    );

    expect(result).toEqual({ schemaDirectory: ".hydrogen-gql-1-schemas", copySchemas: true });
    expect(isUrl(win32.join(result.schemaDirectory, "storefront.schema.json"))).toBe(false);
  });

  it("never copies the schemas on POSIX", () => {
    const result = getSchemaLocation("/proj/.t.json", "/pkg", "/proj/.t-schemas");
    expect(result.copySchemas).toBe(false);
  });
});
