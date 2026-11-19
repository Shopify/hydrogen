import { dirname, relative, resolve } from "node:path";

import type { Rolldown } from "tsdown";

// The `development` build's declarations are re-exports of the production
// build's. A second `dts: true` config builds a second full TypeScript program
// (~1.2 GB with gql.tada's types), and running both pushed the package build
// past the heap limit of macOS CI runners.

const DECLARATION_FILE_RE = /\.d\.[cm]?ts$/;

/**
 * Keeps the declarations of `entries` but drops the JavaScript only they reach,
 * so a production build can type development-only entries without shipping them.
 */
export function declarationsOnly(entries: readonly string[]): Rolldown.Plugin {
  const declarationOnlyIds = new Set(entries.map((entry) => resolve(entry)));

  return {
    name: "declarations-only",
    generateBundle(_options, bundle) {
      const chunks = Object.values(bundle).filter(
        (output): output is Rolldown.OutputChunk =>
          output.type === "chunk" && !DECLARATION_FILE_RE.test(output.fileName),
      );
      const reachable = new Set<string>();
      const visit = (fileName: string) => {
        if (reachable.has(fileName)) return;
        reachable.add(fileName);
        const chunk = bundle[fileName];
        if (chunk?.type !== "chunk") return;
        for (const imported of [...chunk.imports, ...chunk.dynamicImports]) visit(imported);
      };

      for (const chunk of chunks) {
        if (chunk.isEntry && !declarationOnlyIds.has(chunk.facadeModuleId ?? "")) {
          visit(chunk.fileName);
        }
      }
      for (const chunk of chunks) {
        if (reachable.has(chunk.fileName)) continue;
        delete bundle[chunk.fileName];
        delete bundle[`${chunk.fileName}.map`];
      }
    },
  };
}

/**
 * Emits a declaration for each entry chunk that re-exports the declaration at
 * the same path under `productionOutDir`. The production build must include
 * every entry of this build, through `declarationsOnly` when it should not ship
 * the entry's JavaScript.
 */
export function reexportProductionDeclarations(productionOutDir: string): Rolldown.Plugin {
  return {
    name: "reexport-production-declarations",
    generateBundle(options, bundle) {
      const outDir = resolve(options.dir ?? "");
      for (const output of Object.values(bundle)) {
        if (output.type !== "chunk" || !output.isEntry) continue;

        const target = relative(
          dirname(resolve(outDir, output.fileName)),
          resolve(productionOutDir, output.fileName),
        );
        this.emitFile({
          type: "asset",
          fileName: output.fileName.replace(/\.mjs$/, ".d.mts"),
          source: `export * from "${target.startsWith(".") ? target : `./${target}`}";\n`,
        });
      }
    },
  };
}
