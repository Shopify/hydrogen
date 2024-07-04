import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { getCodeFormatOptions, formatCode } from './format-code.js';
import { renderWarning } from '@shopify/cli-kit/node/ui';
import { relativePath, joinPath, resolvePath, basename } from '@shopify/cli-kit/node/path';
import { AbortError } from '@shopify/cli-kit/node/error';
import { importLocal } from './import-utils.js';

const nodePath = process.argv[1];
const modulePath = fileURLToPath(import.meta.url);
const isStandaloneProcess = nodePath === modulePath;
if (isStandaloneProcess) {
  codegen({
    rootDirectory: process.argv[2],
    appDirectory: process.argv[3],
    configFilePath: process.argv[4],
    watch: true
  });
}
function normalizeCodegenError(errorMessage, rootDirectory) {
  if (errorMessage.includes("AbortError: ")) {
    const parsedError = errorMessage.split("AbortError: ")[1] ?? "";
    const message2 = parsedError.split("\n")[0];
    const details2 = parsedError.match(/tryMessage: '(.*)',$/m)?.[1];
    if (message2) return { message: message2, details: details2 };
  }
  const [first = "", ...rest] = errorMessage.replaceAll("[FAILED]", "").replace(/\s{2,}/g, "\n").replace(/\n,\n/, "\n").trim().split("\n");
  const message = "[Codegen] " + first;
  let details = rest.join("\n");
  if (rootDirectory) {
    const forwardSlashRootDir = rootDirectory.replaceAll("\\", "/") + "/";
    details = details.replaceAll(forwardSlashRootDir, "");
  }
  return { message, details };
}
function spawnCodegenProcess({
  rootDirectory,
  appDirectory,
  configFilePath
}) {
  let command;
  let args;
  const hydrogenArgvIndex = process.argv.findIndex((a) => a === "hydrogen");
  if (hydrogenArgvIndex >= 1) {
    command = process.argv[0];
    args = [
      ...process.argv.slice(1, hydrogenArgvIndex + 1),
      "codegen",
      "--watch",
      "--path",
      rootDirectory
    ];
    if (configFilePath) {
      args.push("--codegen-config-path", configFilePath);
    }
  } else {
    command = "node";
    args = [
      fileURLToPath(import.meta.url),
      rootDirectory,
      appDirectory ?? resolvePath("app"),
      configFilePath ?? ""
    ];
  }
  const child = spawn(command, args, { stdio: ["inherit", "ignore", "pipe"] });
  child.stderr.on("data", (data) => {
    const dataString = typeof data === "string" ? data : data?.toString?.("utf8") ?? "";
    if (!dataString) return;
    const { message, details } = normalizeCodegenError(dataString, rootDirectory);
    if (/`punycode`/.test(message)) return;
    if (/\.body\[\d\]/.test(message)) return;
    if (/console\.time(End)?\(\)/.test(message)) return;
    console.log("");
    renderWarning({ headline: message, body: details });
  });
  child.on("close", (code) => {
    if (code && code > 0) {
      renderWarning({
        headline: "Codegen process exited with code " + code,
        body: "There should be more logs above."
      });
    }
  });
  return child;
}
function codegen(options) {
  return generateTypes(options).catch((error) => {
    if (error instanceof AbortError) throw error;
    const { message, details } = normalizeCodegenError(
      error.message,
      options.rootDirectory
    );
    throw new AbortError(message, details);
  });
}
async function generateTypes({
  watch,
  configFilePath,
  forceSfapiVersion,
  ...dirs
}) {
  const { generate, loadCodegenConfig, CodegenContext } = await importLocal(
    "@graphql-codegen/cli",
    dirs.rootDirectory
  ).catch(() => {
    throw new AbortError(
      "Could not load GraphQL Codegen CLI.",
      "Please make sure you have `@graphql-codegen/cli` installed as a dev dependency."
    );
  });
  const { config: codegenConfig } = (
    // Load <root>/codegen.ts if available
    await loadCodegenConfig({
      configFilePath,
      searchPlaces: [dirs.rootDirectory]
    }) || // Fall back to default config
    await generateDefaultConfig(dirs, forceSfapiVersion)
  );
  await addHooksToHydrogenOptions(codegenConfig, dirs);
  const codegenContext = new CodegenContext({
    config: {
      ...codegenConfig,
      watch,
      // Note: do not use `silent` without `watch`, it will swallow errors and
      // won't hide all logs. `errorsOnly` flag doesn't work either.
      silent: !watch,
      // @ts-expect-error this is to avoid process.cwd() in tests
      cwd: dirs.rootDirectory
    },
    // https://github.com/dotansimha/graphql-code-generator/issues/9490
    filepath: "not-used-but-must-be-set"
  });
  codegenContext.cwd = dirs.rootDirectory;
  await generate(codegenContext, true);
  return Object.entries(codegenConfig.generates).reduce((acc, [key, value]) => {
    if ("documents" in value) {
      acc[key] = (Array.isArray(value.documents) ? value.documents : [value.documents]).filter((document) => typeof document === "string");
    }
    return acc;
  }, {});
}
async function generateDefaultConfig({
  rootDirectory,
  appDirectory = resolvePath(rootDirectory, "app")
}, forceSfapiVersion) {
  const { getSchema, preset, pluckConfig } = await importLocal(
    "@shopify/hydrogen-codegen",
    rootDirectory
  ).catch(() => {
    throw new AbortError(
      "Could not load Hydrogen Codegen.",
      "Please make sure you have `@shopify/hydrogen-codegen` installed as a dev dependency."
    );
  });
  const { loadConfig } = await importLocal(
    "graphql-config",
    rootDirectory
  ).catch(() => {
    throw new AbortError(
      "Could not load GraphQL Config.",
      "Please make sure you have `graphql-config` installed as a dev dependency."
    );
  });
  const gqlConfig = await loadConfig({
    rootDir: rootDirectory,
    throwOnEmpty: false,
    throwOnMissing: false,
    legacy: false
  }).catch(() => void 0);
  const sfapiSchema = getSchema("storefront");
  const sfapiProject = findGqlProject(sfapiSchema, gqlConfig);
  const defaultGlob = "*!(*.d).{ts,tsx,js,jsx}";
  const appDirRelative = relativePath(rootDirectory, appDirectory);
  const caapiSchema = getSchema("customer-account", { throwIfMissing: false });
  const caapiProject = caapiSchema ? findGqlProject(caapiSchema, gqlConfig) : void 0;
  const customerAccountAPIConfig = caapiProject?.documents ? {
    ["customer-accountapi.generated.d.ts"]: {
      preset,
      schema: caapiSchema,
      documents: caapiProject?.documents
    }
  } : void 0;
  return {
    filepath: "virtual:codegen",
    config: {
      overwrite: true,
      pluckConfig,
      generates: {
        ["storefrontapi.generated.d.ts"]: {
          preset,
          schema: sfapiSchema,
          documents: sfapiProject?.documents ?? [
            defaultGlob,
            // E.g. ./server.(t|j)s
            joinPath(appDirRelative, "**", defaultGlob)
            // E.g. app/routes/_index.(t|j)sx
          ],
          ...!!forceSfapiVersion && {
            presetConfig: { importTypes: false },
            schema: {
              [`https://hydrogen-preview.myshopify.com/api/${forceSfapiVersion.split(":")[0]}/graphql.json`]: {
                headers: {
                  "content-type": "application/json",
                  "X-Shopify-Storefront-Access-Token": forceSfapiVersion.split(":")[1] ?? "3b580e70970c4528da70c98e097c2fa0"
                }
              }
            },
            config: {
              defaultScalarType: "string",
              scalars: { JSON: "unknown" }
            }
          }
        },
        ...customerAccountAPIConfig
      }
    }
  };
}
function findGqlProject(schemaFilepath, gqlConfig) {
  if (!gqlConfig) return;
  const schemaFilename = basename(schemaFilepath);
  return Object.values(gqlConfig.projects || {}).find(
    (project) => typeof project.schema === "string" && project.schema.endsWith(schemaFilename)
  );
}
async function addHooksToHydrogenOptions(codegenConfig, { rootDirectory }) {
  const hydrogenProjectsOptions = Object.values(codegenConfig.generates).filter(
    (value) => {
      const foundPreset = (Array.isArray(value) ? value[0] : value)?.preset;
      if (typeof foundPreset === "object") {
        const name = Symbol.for("name");
        if (name in foundPreset) {
          return foundPreset[name] === "hydrogen";
        }
      }
    }
  );
  for (const options of hydrogenProjectsOptions) {
    const hydrogenOptions = Array.isArray(options) ? options[0] : options;
    if (hydrogenOptions) {
      const formatConfig = await getCodeFormatOptions(rootDirectory);
      hydrogenOptions.hooks = {
        beforeOneFileWrite: (file, content) => formatCode(content, formatConfig, file),
        ...hydrogenOptions.hooks
      };
    }
  }
}

export { codegen, spawnCodegenProcess };
