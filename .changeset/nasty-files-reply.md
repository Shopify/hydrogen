---
'@shopify/cli-hydrogen': minor
---

Add experimental support for Vite projects.

In the Vite config of you Vite<>Remix project, import and use the new experimental Hydrogen and Oxygen plugins, and include them before Remix:

```ts
import {defineConfig} from 'vite';
import {hydrogen, oxygen} from '@shopify/cli-hydrogen/experimental-vite';
import {vitePlugin as remix} from '@remix-run/dev';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [
    hydrogen(), // Adds utilities like GraphiQL and Subrequest Profiler
    oxygen(), // Runs your app using the MiniOxygen runtime (closer to production)
    remix({buildDirectory: 'dist'}), // Use `dist` to be compatible with `h2 deploy`
    tsconfigPaths(),
  ],
});
```

Then, run `h2 dev-vite` and `h2 build-vite` commands to start and build your app.

Please report any issue with this new feature, and let us know if you have any feedback or suggestions.
