# Mini Oxygen

## Getting Started

MiniOxygen is a local runtime that simulates Oxygen production. It is based on Cloudflare's [workerd](https://github.com/cloudflare/workerd) via [Miniflare](https://miniflare.dev/).

To use MiniOxygen within your app, follow these steps:

Add `@shopify/mini-oxygen` as a dev dependency of your app:

```shell
npm install --save-dev @shopify/mini-oxygen
```

Import it and create a new instance of Mini Oxygen:

```js
import {createMiniOxygen} from '@shopify/mini-oxygen';

const miniOxygen = createMiniOxygen({
  workers: [
    {
      name: 'main',
      modules: true,
      script: `export default {
        async fetch() {
          const response = await fetch("https://hydrogen.shopify.dev");
          return response;
        }
      }`,
    },
  ],
});
```

Dispatch requests to MiniOxygen from the browser or any other environment:

```js
const response = await miniOxygen.dispatchFetch('http://placeholder');
// Or with the following code via network request:
// const {workerUrl} = await miniOxygen.ready;
// const response = await fetch(workerUrl);

console.log(await response.text());

await miniOxygen.dispose();
```

### Legacy Node.js Sandbox runtime

The previous Node.js sandbox runtime has been moved to the `@shopify/mini-oxygen/node` export. It is not recommended for new projects, but can be used as follows:

```js
import {createMiniOxygen} from '@shopify/mini-oxygen/node';

const miniOxygen = createMiniOxygen({
  script: `export default {
  async fetch() {
     const response = await fetch("https://hydrogen.shopify.dev");
     return response;
  }
 }`,
});

const response = await miniOxygen.dispatchFetch('http://placeholder');

console.log(await response.text());

await miniOxygen.dispose();
```
