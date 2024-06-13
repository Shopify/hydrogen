import path from 'node:path';
import {defineConfig} from 'vite';
import {vitePlugin as remix} from '@remix-run/dev';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [
    remix({
      ignoredRouteFiles: ['**/.*'],
      future: {
        v3_fetcherPersist: false,
        v3_relativeSplatPath: false,
        v3_throwAbortReason: false,
      },
    }),
    tsconfigPaths(),
    {
      name: 'docs:preview',
      resolveId(id) {
        if (id.startsWith('virtual:docs.json')) {
          return {
            id: path.join(
              process.env.INIT_CWD,
              process.env.GEN_DOCS_PATH ??
                'docs/generated/generated_docs_data.json',
            ),
          };
        }
      },
    },
  ],
});
