import { readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { fileExists, mkdir, copyFile, readFile, writeFile } from '@shopify/cli-kit/node/fs';
import { joinPath, relativizePath, dirname, relativePath, resolvePath, basename } from '@shopify/cli-kit/node/path';
import { AbortError } from '@shopify/cli-kit/node/error';
import { renderConfirmationPrompt } from '@shopify/cli-kit/node/ui';
import { transpileFile } from '../../transpile/index.js';
import { getCodeFormatOptions, formatCode } from '../../../lib/format-code.js';
import { getTemplateAppFile, GENERATOR_ROUTE_DIR, getStarterDir } from '../../../lib/build.js';
import { convertRouteToV1 } from '../../../lib/remix-version-interop.js';
import { getRemixConfig } from '../../remix-config.js';
import { findFileWithExtension } from '../../file.js';

const NO_LOCALE_PATTERNS = [/robots\.txt/];
const ROUTE_MAP = {
  home: ["_index", "$"],
  page: "pages*",
  cart: ["cart", "cart.$lines", "discount.$code"],
  products: "products*",
  collections: "collections*",
  policies: "policies*",
  blogs: "blogs*",
  account: "account*",
  search: ["search", "api.predictive-search"],
  robots: "[robots.txt]",
  sitemap: "[sitemap.xml]"
};
let allRouteTemplateFiles = [];
async function getResolvedRoutes(routeKeys = Object.keys(ROUTE_MAP)) {
  if (allRouteTemplateFiles.length === 0) {
    allRouteTemplateFiles = (await readdir(getTemplateAppFile(GENERATOR_ROUTE_DIR))).map((item) => item.replace(/\.tsx?$/, ""));
  }
  const routeGroups = {};
  const resolvedRouteFiles = [];
  for (const key of routeKeys) {
    routeGroups[key] = [];
    const value = ROUTE_MAP[key];
    if (!value) {
      throw new AbortError(
        `No route found for ${key}. Try one of ${ALL_ROUTE_CHOICES.join()}.`
      );
    }
    const routes = Array.isArray(value) ? value : [value];
    for (const route of routes) {
      const routePrefix = route.replace("*", "");
      routeGroups[key].push(
        ...allRouteTemplateFiles.filter((file) => file.startsWith(routePrefix))
      );
    }
    resolvedRouteFiles.push(...routeGroups[key]);
  }
  return { routeGroups, resolvedRouteFiles };
}
const ALL_ROUTE_CHOICES = [...Object.keys(ROUTE_MAP), "all"];
async function generateRoutes(options, remixConfig) {
  const { routeGroups, resolvedRouteFiles } = options.routeName === "all" ? await getResolvedRoutes() : await getResolvedRoutes([options.routeName]);
  const { rootDirectory, appDirectory } = remixConfig || await getRemixConfig(options.directory);
  const routesArray = resolvedRouteFiles.flatMap(
    (item) => GENERATOR_ROUTE_DIR + "/" + item
  );
  const formatOptions = await getCodeFormatOptions(rootDirectory);
  const routesDirectory = joinPath(appDirectory, GENERATOR_ROUTE_DIR);
  const localePrefix = await getLocalePrefix(routesDirectory, options);
  const typescript = !!(options.typescript ?? await fileExists(joinPath(rootDirectory, "tsconfig.json")));
  const routes = [];
  for (const route of routesArray) {
    routes.push(
      await generateProjectFile(route, {
        ...options,
        typescript,
        localePrefix,
        rootDirectory,
        appDirectory,
        formatOptions
      })
    );
  }
  if (localePrefix) {
    await copyLocaleNamelessRoute({
      typescript,
      localePrefix,
      routesDirectory,
      formatOptions,
      adapter: options.adapter
    });
  }
  return {
    routes,
    routeGroups,
    isTypescript: typescript,
    formatOptions
  };
}
async function getLocalePrefix(routesDirectory, { localePrefix, routeName, v1RouteConvention }) {
  if (localePrefix)
    return localePrefix;
  if (localePrefix !== void 0 || routeName === "all")
    return;
  const existingFiles = await readdir(routesDirectory).catch(() => []);
  const coreRouteWithLocaleRE = v1RouteConvention ? /^\(\$(\w+)\)$/ : /^\(\$(\w+)\)\.(_index|\$|cart).[jt]sx?$/;
  const coreRouteWithLocale = existingFiles.find(
    (file) => coreRouteWithLocaleRE.test(file)
  );
  if (coreRouteWithLocale) {
    return coreRouteWithLocale.match(coreRouteWithLocaleRE)?.[1];
  }
}
async function generateProjectFile(routeFrom, {
  rootDirectory,
  appDirectory,
  typescript,
  force,
  adapter,
  templatesRoot = getStarterDir(),
  formatOptions,
  localePrefix,
  v1RouteConvention = false,
  signal
}) {
  const extension = (routeFrom.match(/(\.[jt]sx?)$/) ?? [])[1] ?? ".tsx";
  routeFrom = routeFrom.replace(extension, "");
  const routeTemplatePath = getTemplateAppFile(
    routeFrom + extension,
    templatesRoot
  );
  const allFilesToGenerate = await findRouteDependencies(
    routeTemplatePath,
    getTemplateAppFile("", templatesRoot)
  );
  const routeDestinationPath = joinPath(
    appDirectory,
    getDestinationRoute(routeFrom, localePrefix, { v1RouteConvention }) + (typescript ? extension : extension.replace(".ts", ".js"))
  );
  const result = {
    operation: "created",
    sourceRoute: routeFrom,
    destinationRoute: relativizePath(routeDestinationPath, rootDirectory)
  };
  if (!force && await fileExists(routeDestinationPath)) {
    const shouldOverwrite = await renderConfirmationPrompt({
      message: `The file ${result.destinationRoute} already exists. Do you want to replace it?`,
      defaultValue: false,
      confirmationMessage: "Yes",
      cancellationMessage: "No",
      abortSignal: signal
    });
    if (!shouldOverwrite)
      return { ...result, operation: "skipped" };
    result.operation = "replaced";
  }
  for (const filePath of allFilesToGenerate) {
    const isRoute = filePath.startsWith(GENERATOR_ROUTE_DIR + "/");
    const destinationPath = isRoute ? routeDestinationPath : joinPath(
      appDirectory,
      filePath.replace(/\.ts(x?)$/, `.${typescript ? "ts$1" : "js$1"}`)
    );
    if (!await fileExists(dirname(destinationPath))) {
      await mkdir(dirname(destinationPath));
    }
    const templateAppFilePath = getTemplateAppFile(filePath, templatesRoot);
    if (!/\.[jt]sx?$/.test(filePath)) {
      await copyFile(templateAppFilePath, destinationPath);
      continue;
    }
    let templateContent = await readFile(templateAppFilePath);
    if (!typescript) {
      templateContent = await transpileFile(
        templateContent,
        templateAppFilePath
      );
    }
    if (adapter) {
      templateContent = replaceAdapters(templateContent, adapter);
    }
    templateContent = await formatCode(
      templateContent,
      formatOptions,
      destinationPath
    );
    await writeFile(destinationPath, templateContent);
  }
  return result;
}
function replaceAdapters(templateContent, adapter) {
  return templateContent.replace(/@shopify\/remix-oxygen/g, adapter);
}
function getDestinationRoute(routeFrom, localePrefix, options) {
  const routePath = routeFrom.replace(GENERATOR_ROUTE_DIR + "/", "");
  const filePrefix = localePrefix && !NO_LOCALE_PATTERNS.some((pattern) => pattern.test(routePath)) ? `($${localePrefix})` + (options.v1RouteConvention ? "/" : ".") : "";
  return GENERATOR_ROUTE_DIR + "/" + filePrefix + // The template file uses the v2 route convention, so we need to convert
  // it to v1 if the user is not using v2.
  (options.v1RouteConvention ? convertRouteToV1(routePath) : routePath);
}
async function findRouteDependencies(routeFilePath, appDirectory) {
  const filesToCheck = /* @__PURE__ */ new Set([routeFilePath]);
  const fileDependencies = /* @__PURE__ */ new Set([relativePath(appDirectory, routeFilePath)]);
  for (const filePath of filesToCheck) {
    const importMatches = (await readFile(filePath, { encoding: "utf8" })).matchAll(/^(import|export)\s+.*?\s+from\s+['"](.*?)['"];?$/gims);
    for (let [, , match] of importMatches) {
      if (!match || !/^(\.|~)/.test(match))
        continue;
      match = match.replace(/\?[a-z.]+$/, "");
      match = match.replace(
        "~",
        // import from '~/components/...'
        relativePath(dirname(filePath), appDirectory) || "."
      );
      const resolvedMatchPath = resolvePath(dirname(filePath), match);
      const absoluteFilepath = (await findFileWithExtension(
        dirname(resolvedMatchPath),
        basename(resolvedMatchPath)
      )).filepath || resolvedMatchPath;
      if (!absoluteFilepath.includes(`/${GENERATOR_ROUTE_DIR}/`)) {
        fileDependencies.add(relativePath(appDirectory, absoluteFilepath));
        if (/\.[jt]sx?$/.test(absoluteFilepath)) {
          filesToCheck.add(absoluteFilepath);
        }
      }
    }
  }
  return [...fileDependencies];
}
async function renderRoutePrompt(options) {
  const generateAll = await renderConfirmationPrompt({
    message: "Scaffold all standard route files? " + Object.keys(ROUTE_MAP).join(", "),
    confirmationMessage: "Yes",
    cancellationMessage: "No",
    ...options
  });
  return generateAll ? "all" : [];
}
function copyLocaleNamelessRoute({
  typescript,
  localePrefix,
  ...options
}) {
  return copyRouteTemplate({
    ...options,
    typescript,
    templateName: "locale-check.ts",
    routeName: `($${localePrefix})${typescript ? ".tsx" : ".jsx"}`
  });
}
async function copyRouteTemplate({
  templateName,
  routeName,
  routesDirectory,
  formatOptions,
  typescript,
  adapter
}) {
  const routePath = joinPath(routesDirectory, routeName);
  if (await fileExists(routePath))
    return;
  const templatePath = fileURLToPath(
    new URL(`./templates/${templateName}`, import.meta.url)
  );
  if (!await fileExists(templatePath)) {
    throw new Error("Unknown strategy");
  }
  let templateContent = await readFile(templatePath);
  if (adapter) {
    templateContent = replaceAdapters(templateContent, adapter);
  }
  if (!typescript) {
    templateContent = await transpileFile(templateContent, templatePath);
  }
  templateContent = await formatCode(templateContent, formatOptions, routePath);
  await writeFile(routePath, templateContent);
}

export { ALL_ROUTE_CHOICES, generateProjectFile, generateRoutes, getResolvedRoutes, renderRoutePrompt };
