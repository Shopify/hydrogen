---
'skeleton': patch
---

In Vite projects, the way that plugins are imported and the options passed to Remix have changed:

```diff
-import {hydrogen, oxygen} from '@shopify/cli-hydrogen/experimental-vite';
+import {hydrogen} from '@shopify/hydrogen/vite';
+import {oxygen} from '@shopify/mini-oxygen/vite';
import {vitePlugin as remix} from '@remix-run/dev';

export default defineConfig({
    hydrogen(),
    oxygen(),
    remix({
-     buildDirectory: 'dist',
+     presets: [hydrogen.preset()],
      future: {
```
