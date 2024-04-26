import { AbortError } from '@shopify/cli-kit/node/error';
import { joinPath, resolvePath } from '@shopify/cli-kit/node/path';
import { fileExists } from '@shopify/cli-kit/node/fs';
import { replaceFileContent, findFileWithExtension } from '../../file.js';
import { importLangAstGrep } from '../../ast.js';
import { transpileFile } from '../../transpile/index.js';

async function replaceServerI18n({ rootDirectory, serverEntryPoint = "server" }, formatConfig, localeExtractImpl, isJs) {
  const { filepath, astType } = await findEntryFile({
    rootDirectory,
    serverEntryPoint
  });
  await replaceFileContent(filepath, formatConfig, async (content) => {
    const astGrep = await importLangAstGrep(astType);
    const root = astGrep.parse(content).root();
    const requestIdentifier = root.find({
      rule: {
        kind: "identifier",
        inside: {
          kind: "formal_parameters",
          stopBy: "end",
          inside: {
            kind: "method_definition",
            stopBy: "end",
            has: {
              kind: "property_identifier",
              regex: "^fetch$"
            },
            inside: {
              kind: "export_statement",
              stopBy: "end"
            }
          }
        }
      }
    });
    const requestIdentifierName = requestIdentifier?.text() ?? "request";
    const i18nFunctionName = localeExtractImpl.match(
      /^(export )?function (\w+)/m
    )?.[2];
    if (!i18nFunctionName) {
      throw new Error("Could not find the i18n function name");
    }
    const i18nFunctionCall = `${i18nFunctionName}(${requestIdentifierName})`;
    const hydrogenImportPath = "@shopify/hydrogen";
    const hydrogenImportName = "createStorefrontClient";
    const importSpecifier = root.find({
      rule: {
        kind: "import_specifier",
        inside: {
          kind: "import_statement",
          stopBy: "end",
          has: {
            kind: "string_fragment",
            stopBy: "end",
            regex: `^${hydrogenImportPath}$`
          }
        },
        has: {
          kind: "identifier",
          regex: `^${hydrogenImportName}`
          // could be appended with " as ..."
        }
      }
    });
    let [importName, importAlias] = importSpecifier?.text().split(/\s+as\s+/) || [];
    importName = importAlias ?? importName;
    if (!importName) {
      throw new AbortError(
        `Could not find a Hydrogen import in ${serverEntryPoint}`,
        `Please import "${hydrogenImportName}" from "${hydrogenImportPath}"`
      );
    }
    const argumentObject = root.find({
      rule: {
        kind: "object",
        inside: {
          kind: "arguments",
          inside: {
            kind: "call_expression",
            has: {
              kind: "identifier",
              regex: importName
            }
          }
        }
      }
    });
    if (!argumentObject) {
      throw new AbortError(
        `Could not find a Hydrogen client instantiation with an inline object as argument in ${serverEntryPoint}`,
        `Please add a call to ${importName}({...})`
      );
    }
    const defaultExportObject = root.find({
      rule: {
        kind: "export_statement",
        regex: "^export default \\{"
      }
    });
    if (!defaultExportObject) {
      throw new AbortError(
        "Could not find a default export in the server entry point"
      );
    }
    let localeExtractFn = localeExtractImpl.match(/^(\/\*\*.*?\*\/\n)?^function .+?^}/ms)?.[0] || "";
    if (!localeExtractFn) {
      throw new AbortError(
        "Could not find the locale extract function. This is a bug in Hydrogen."
      );
    }
    if (isJs) {
      localeExtractFn = await transpileFile(
        localeExtractFn,
        "locale-extract-server.ts"
      );
    } else {
      localeExtractFn = localeExtractFn.replace(/\/\*\*.*?\*\//gms, "");
    }
    const defaultExportEnd = defaultExportObject.range().end.index;
    content = content.slice(0, defaultExportEnd) + `

${localeExtractFn}
` + content.slice(defaultExportEnd);
    const i18nProperty = argumentObject.find({
      rule: {
        kind: "property_identifier",
        regex: "^i18n$"
      }
    });
    const i18nValue = i18nProperty?.next()?.next();
    if (i18nValue) {
      if (i18nValue.text().includes(i18nFunctionName)) {
        throw new AbortError(
          "An i18n strategy is already set up.",
          `Remove the existing i18n property in the ${importName}({...}) call to set up a new one.`
        );
      }
      const { start, end } = i18nValue.range();
      content = content.slice(0, start.index) + i18nFunctionCall + content.slice(end.index);
    } else {
      const { end } = argumentObject.range();
      const firstPart = content.slice(0, end.index - 1);
      content = firstPart + ((/,\s*$/.test(firstPart) ? "" : ",") + `i18n: ${i18nFunctionCall}`) + content.slice(end.index - 1);
    }
    return content;
  });
}
async function replaceRemixEnv({ rootDirectory }, formatConfig, localeExtractImpl) {
  let envPath = joinPath(rootDirectory, "env.d.ts");
  if (!await fileExists(envPath)) {
    envPath = "remix.env.d.ts";
    if (!await fileExists(envPath)) {
      return;
    }
  }
  const i18nType = localeExtractImpl.match(
    /^(export )?(type \w+ =\s+\{.*?\};)\n/ms
  )?.[2];
  const i18nTypeName = i18nType?.match(/^type (\w+)/)?.[1];
  if (!i18nTypeName) {
    return;
  }
  await replaceFileContent(envPath, formatConfig, async (content) => {
    if (content.includes(`Storefront<`))
      return;
    const astGrep = await importLangAstGrep("ts");
    const root = astGrep.parse(content).root();
    const storefrontTypeNode = root.find({
      rule: {
        kind: "property_signature",
        has: {
          kind: "type_annotation",
          has: {
            regex: "^Storefront$"
          }
        },
        inside: {
          kind: "interface_declaration",
          stopBy: "end",
          regex: "AppLoadContext"
        }
      }
    });
    if (storefrontTypeNode) {
      const storefrontTypeNodeRange = storefrontTypeNode.range();
      content = content.slice(0, storefrontTypeNodeRange.end.index) + `<${i18nTypeName}>` + content.slice(storefrontTypeNodeRange.end.index);
    }
    const ambientDeclarationContentNode = root.find({
      rule: {
        kind: "statement_block",
        inside: {
          kind: "ambient_declaration"
        }
      }
    });
    const i18nTypeDeclaration = `
    /**
     * The I18nLocale used for Storefront API query context.
     */
    ${i18nType}`;
    if (ambientDeclarationContentNode) {
      const { end } = ambientDeclarationContentNode.range();
      content = content.slice(0, end.index - 1) + `

${i18nTypeDeclaration}
` + content.slice(end.index - 1);
    } else {
      content = content + `

declare global {
${i18nTypeDeclaration}
}`;
    }
    const importImplTypes = localeExtractImpl.match(
      /import\s+type\s+[^;]+?;/
    )?.[0];
    if (importImplTypes) {
      const importPlace = root.findAll({
        rule: {
          kind: "import_statement",
          has: {
            kind: "string_fragment",
            stopBy: "end",
            regex: `^@shopify/hydrogen$`
          }
        }
      }).pop() ?? root.findAll({ rule: { kind: "import_statement" } }).pop() ?? root.findAll({ rule: { kind: "comment", regex: "^/// <reference" } }).pop();
      const importPlaceRange = importPlace?.range() ?? { end: { index: 0 } };
      content = content.slice(0, importPlaceRange.end.index) + importImplTypes.replace(
        /'[^']+'/,
        `'@shopify/hydrogen/storefront-api-types'`
      ) + content.slice(importPlaceRange.end.index);
    }
    return content;
  });
}
async function findEntryFile({
  rootDirectory,
  serverEntryPoint = "server"
}) {
  const match = serverEntryPoint.match(/\.([jt]sx?)$/)?.[1];
  const { filepath, astType } = match ? { filepath: resolvePath(rootDirectory, serverEntryPoint), astType: match } : await findFileWithExtension(rootDirectory, serverEntryPoint);
  if (!filepath || !astType) {
    throw new AbortError(
      `Could not find a server entry point at ${serverEntryPoint}`
    );
  }
  return { filepath, astType };
}

export { replaceRemixEnv, replaceServerI18n };
