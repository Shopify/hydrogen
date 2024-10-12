Use the `/public` folder to store static files that **shouldn't be processed at build time**.

Files in `/public`:
- Get uploaded to the Shopify CDN on deployment
  - `/public/image.png` → `cdn.shopify.com/0000/0000/0000/image.png`
- Can't be imported in your app files (see `/app/assets` instead)
- Aren't processed by Hydrogen's build tools
