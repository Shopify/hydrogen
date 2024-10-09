Use the `/app/assets` folder to store static files that **should be processed at build time**.

Files in `/app/assets`:
- Get uploaded to the Shopify CDN on deployment
  - `/app/assets/logo.png` → `cdn.shopify.com/0000/0000/0000/assets/logo-p7f8c0gh.png`
- Can be imported in your app files
  - Example: `import logo from '~/app/assets/logo.png'`
- Get processed by Hydrogen's build tools
  - File names are likely to be hashed (`/app/assets/logo.svg` -> `/dist/assets/logo-p7f8c0gh.svg`)
  - SVG images may be inlined
  - CSS or JavaScript files may be chunked, uglified, and/or minified
