import {readFileSync} from 'node:fs';
import Module from 'module';

const wrapUseLoaderDataPlugin = {
  name: 'wrapUseLoaderDataPlugin',
  setup(build: any) {
    let patchedContents: string;

    build.onLoad(
      {filter: /@remix-run\/react\/dist\/esm\/index\.js$/},
      (args: any) => {
        if (!patchedContents) {
          patchedContents =
            readFileSync(args.path, 'utf8').replace('useLoaderData,', '') +
            '\nimport {useLoaderData as _useLoaderData} from "./components.js";' +
            '\nimport {createLoaderDataTracker} from "@shopify/hydrogen";' +
            '\nexport const useLoaderData = createLoaderDataTracker(_useLoaderData);';
        }

        return {contents: patchedContents};
      },
    );
  },
};

export function patchRemix() {
  // @ts-ignore
  const jsTransformer = Module._extensions['.js'];
  // @ts-ignore
  Module._extensions['.js'] = function (mod: any, filename: any) {
    if (filename.endsWith('@remix-run/dev/dist/compiler/server/compiler.js')) {
      // @ts-ignore
      globalThis.__DEV_SERVER_ESBUILD_PLUGINS = [wrapUseLoaderDataPlugin];

      mod._compile(
        readFileSync(filename, 'utf8').replace(
          /,\s*plugins,?\s*}/,
          ',plugins: [...plugins, ...(globalThis.__DEV_SERVER_ESBUILD_PLUGINS || [])]}',
        ),
        filename,
      );
    } else {
      jsTransformer(mod, filename);
    }
  };
}
