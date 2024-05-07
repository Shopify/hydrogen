import { AbortError } from '@shopify/cli-kit/node/error';
import { findFileWithExtension, replaceFileContent } from '../../file.js';
import { importLangAstGrep } from '../../ast.js';

async function replaceRemixConfig(rootDirectory, formatConfig, newProperties) {
  const { filepath, astType } = await findFileWithExtension(
    rootDirectory,
    "remix.config"
  );
  if (!filepath || !astType) {
    throw new AbortError(
      `Could not find remix.config.js file in ${rootDirectory}`
    );
  }
  await replaceFileContent(filepath, formatConfig, async (content) => {
    const astGrep = await importLangAstGrep(astType);
    const root = astGrep.parse(content).root();
    const remixConfigNode = root.find({
      rule: {
        kind: "object",
        inside: {
          any: [
            {
              kind: "export_statement"
              // ESM
            },
            {
              kind: "assignment_expression",
              // CJS
              has: {
                kind: "member_expression",
                field: "left",
                pattern: "module.exports"
              }
            }
          ]
        }
      }
    });
    if (!remixConfigNode) {
      throw new AbortError(
        "Could not find a default export in remix.config.js"
      );
    }
    newProperties = { ...newProperties };
    for (const key of Object.keys(newProperties)) {
      const propertyNode = remixConfigNode.find({
        rule: {
          kind: "pair",
          has: {
            field: "key",
            regex: `^${key}$`
          }
        }
      });
      if (propertyNode?.text().endsWith(" " + JSON.stringify(newProperties[key]))) {
        delete newProperties[key];
      }
    }
    if (Object.keys(newProperties).length === 0) {
      return;
    }
    const childrenNodes = remixConfigNode.children();
    const lastNode = childrenNodes.find((node) => node.text().startsWith("future:")) ?? childrenNodes.pop();
    if (!lastNode) {
      throw new AbortError("Could not add properties to Remix config");
    }
    const { start } = lastNode.range();
    return content.slice(0, start.index) + JSON.stringify(newProperties).slice(1, -1) + "," + content.slice(start.index);
  });
}
async function replaceRootLinks(appDirectory, formatConfig, importer) {
  const { filepath, astType } = await findFileWithExtension(appDirectory, "root");
  if (!filepath || !astType) {
    throw new AbortError(`Could not find root file in ${appDirectory}`);
  }
  await replaceFileContent(filepath, formatConfig, async (content) => {
    const importStatement = `import ${importer.isDefault ? importer.name : `{${importer.name}}`} from '${(importer.isAbsolute ? "" : "./") + importer.path}';`;
    if (content.includes(importStatement.split("from")[0])) {
      return;
    }
    const astGrep = await importLangAstGrep(astType);
    const root = astGrep.parse(content).root();
    const lastImportNode = root.findAll({ rule: { kind: "import_statement" } }).pop();
    const linksReturnNode = root.find({
      utils: {
        "has-links-id": {
          has: {
            kind: "identifier",
            pattern: "links"
          }
        }
      },
      rule: {
        kind: "return_statement",
        pattern: "return [$$$]",
        inside: {
          any: [
            {
              kind: "function_declaration",
              matches: "has-links-id"
            },
            {
              kind: "variable_declarator",
              matches: "has-links-id"
            }
          ],
          stopBy: "end",
          inside: {
            stopBy: "end",
            kind: "export_statement"
          }
        }
      }
    });
    if (!lastImportNode || !linksReturnNode) {
      throw new AbortError(
        'Could not find a "links" export in root file. Please add one and try again.'
      );
    }
    const lastImportContent = lastImportNode.text();
    const linksExportReturnContent = linksReturnNode.text();
    const newLinkReturnItem = importer.isConditional ? `...(${importer.name} ? [{ rel: 'stylesheet', href: ${importer.name} }] : [])` : `{rel: 'stylesheet', href: ${importer.name}}`;
    return content.replace(lastImportContent, lastImportContent + "\n" + importStatement).replace(
      linksExportReturnContent,
      linksExportReturnContent.replace("[", `[${newLinkReturnItem},`)
    );
  });
}
function injectCssBundlingLink(appDirectory, formatConfig) {
  return replaceRootLinks(appDirectory, formatConfig, {
    name: "cssBundleHref",
    path: "@remix-run/css-bundle",
    isDefault: false,
    isConditional: true,
    isAbsolute: true
  });
}

export { injectCssBundlingLink, replaceRemixConfig, replaceRootLinks };
