# Mini Oxygen

## Getting Started

For modules support (necessary for module workers), the node instance that spawns this module should be launched with the `--experimental-vm-modules` option. For a cross platform way of adding this flag to your runtime, you could take a look at Miniflare's implementation [here](https://github.com/cloudflare/miniflare/blob/870b401ef520c1826339ff060fd8a0a576392a91/packages/miniflare/bootstrap.js).

To use Mini Oxygen within your app, follow these steps:

Add `@shopify/mini-oxygen` as a dev dependency of your app:

```shell
yarn add --dev @shopify/mini-oxygen
```

or

```shell
npm install --save-dev @shopify/mini-oxygen
```

Mini Oxygen can then be loaded with:

```javascript
import {startServer} from '@shopify/mini-oxygen';
```

A Mini Oxygen server can then be activated with:

```javascript
await startServer({<MiniOxygenPreviewOptions>})
```

`MiniOxygenPreviewOptions` has the following attributes:

- `port`: the TCP port used for the local web server on localhost
- `workerFile`: path to the worker file related to the current dir
- `assetsDir`: path to the built assets directory related to the current dir
- `publicPath`: URL or pathname for public/static assets that prefixes file names
- `proxyServer`: proxy server address and port (<address>:<port>) to proxy requests to
- `buildCommand`: a command to re-build the project
- `watch`: enable or disable rebuild on source file changes
- `buildWatchPaths`: an array of directories to watch for changes
- `autoReload`: enables auto reload of the browser after re-building
- `modules`: enables module syntax in the worker script
- `envPath`: (optional) path to the .env file to be loaded automatically
- `env`: specify environment variables available in the worker script

The following server hooks can be specified as part of the options:

- `onRequest`: (optional) function taking in `Request` parameter
- `onReponse`: (optional) function taking in parameters of type `Request` and `Response`
- `onResponseError`: (optional) function that accepts `Response` and unknown `error` attribute.
