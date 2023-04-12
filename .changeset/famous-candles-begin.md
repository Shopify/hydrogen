---
'demo-store': patch
---

Adopt Remix [`unstable_tailwind`](https://remix.run/docs/en/1.15.0/guides/styling#built-in-tailwind-support) and [`unstable_postcss`](https://remix.run/docs/en/1.15.0/guides/styling#built-in-postcss-support) future flags for the Demo Store template.

### `unstable_tailwind` and `unstable_postcss` migration steps

1. Move the file `<root>/styles/app.css` to `<root>/app/styles/app.css`, and remove it from `.gitignore`.

2. Add `"browserslist": ["defaults"]` to your `package.json`, or your preferred [value from Browserslist](https://browsersl.ist/).

3. Replace the `build` and `dev` scripts in your `package.json` with the following:

   **Before**

   ```json
    "scripts": {
      "build": "npm run build:css && shopify hydrogen build",
      "build:css": "postcss styles --base styles --dir app/styles --env production",
      "dev": "npm run build:css && concurrently -g --kill-others-on-fail -r npm:dev:css \"shopify hydrogen dev\"",
      "dev:css": "postcss styles --base styles --dir app/styles -w",
      ...
    }
   ```

   **After**

   ```json
    "scripts": {
      "dev": "shopify hydrogen dev",
      "build": "shopify hydrogen build",
      ...
    }
   ```

You can also remove dependencies like `concurrently` if you don't use them anywhere else.
