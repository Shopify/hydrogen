import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { checkGraphQL } from "./gql";

const TSCONFIG_PATH_ARGUMENT_INDEX = 3;
const tempDirectories: string[] = [];

function createTempDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), "hydrogen-gql-test-"));
  tempDirectories.push(directory);
  return directory;
}

function toTsconfigRelativeSchemaDirectory(tsconfigDirectory: string, packageRoot: string): string {
  return relative(tsconfigDirectory, join(packageRoot, "dist")).split(sep).join("/");
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
    const schemaDirectory = toTsconfigRelativeSchemaDirectory(cwd, packageRoot);
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
                    schema: `${schemaDirectory}/storefront.schema.json`,
                    tadaOutputLocation: "storefront-graphql-env.d.ts",
                  },
                  {
                    name: "customer-account",
                    schema: `${schemaDirectory}/customer-account.schema.json`,
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

  it("points gql.tada at the bundled schemas with paths it cannot parse as URLs", async () => {
    const cwd = createTempDirectory();
    const packageRoot = createTempDirectory();
    const configuredTsconfigPath = join(cwd, "config/tsconfig.app.json");
    let didRunCommand = false;

    mkdirSync(join(cwd, "config"));
    mkdirSync(join(packageRoot, "dist"));
    writeFileSync(configuredTsconfigPath, "{}");
    writeFileSync(join(packageRoot, "dist/storefront.schema.json"), "{}");
    writeFileSync(join(packageRoot, "dist/customer-account.schema.json"), "{}");

    await checkGraphQL({
      args: ["--tsconfig", "config/tsconfig.app.json"],
      cwd,
      gqlTadaCliPath: join(packageRoot, "gql-tada.js"),
      packageRoot,
      runCommand: async (_command, args) => {
        didRunCommand = true;
        const temporaryTsconfigPath = args[TSCONFIG_PATH_ARGUMENT_INDEX];
        const shadowConfig = JSON.parse(readFileSync(temporaryTsconfigPath, "utf8"));
        const [plugin] = shadowConfig.compilerOptions.plugins;
        expect(plugin.schemas).toHaveLength(2);

        for (const { name, schema } of plugin.schemas) {
          expect(isAbsolute(schema)).toBe(false);
          expect(schema).not.toContain("\\");
          expect(() => new URL(schema)).toThrow();
          expect(resolve(dirname(temporaryTsconfigPath), schema)).toBe(
            join(packageRoot, "dist", `${name}.schema.json`),
          );
          expect(existsSync(resolve(dirname(temporaryTsconfigPath), schema))).toBe(true);
        }
      },
    });

    expect(didRunCommand).toBe(true);
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
