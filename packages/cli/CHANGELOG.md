# @shopify/cli-hydrogen

## 9.0.4

### Patch Changes

- Bump cli version ([#2694](https://github.com/Shopify/hydrogen/pull/2694)) by [@wizardlyhel](https://github.com/wizardlyhel)

## 9.0.3

### Patch Changes

- Attach Hydrogen version metadata to deployments ([#2645](https://github.com/Shopify/hydrogen/pull/2645)) by [@benwolfram](https://github.com/benwolfram)

## 9.0.2

### Patch Changes

- Restore cli-kit dependency ([#2629](https://github.com/Shopify/hydrogen/pull/2629)) by [@rbshop](https://github.com/rbshop)

## 9.0.1

### Patch Changes

- Bump cli and cli-kit version ([#2627](https://github.com/Shopify/hydrogen/pull/2627)) by [@wizardlyhel](https://github.com/wizardlyhel)

## 9.0.0

### Minor Changes

- Remove deprecated --worker cli flag ([#2603](https://github.com/Shopify/hydrogen/pull/2603)) by [@rbshop](https://github.com/rbshop)

### Patch Changes

- Add warnings to the Shopify CLI when your app uses reserved routes. These routes are reserved by Oxygen, and any local routes that conflict with them will not be used. ([#2613](https://github.com/Shopify/hydrogen/pull/2613)) by [@blittle](https://github.com/blittle)

- Updated dependencies [[`a0f660aa`](https://github.com/Shopify/hydrogen/commit/a0f660aac56a5c3c41502c17d2ed44d3468ee6aa), [`29876f12`](https://github.com/Shopify/hydrogen/commit/29876f12c39ed23b0b80443769e566d29e84b56c)]:
  - @shopify/hydrogen-codegen@0.3.2
  - @shopify/mini-oxygen@3.1.0

## 8.4.6

### Patch Changes

- Bump cli packages version ([#2592](https://github.com/Shopify/hydrogen/pull/2592)) by [@wizardlyhel](https://github.com/wizardlyhel)

## 8.4.5

### Patch Changes

- Update starter template with latest Hydrogen version. ([#2580](https://github.com/Shopify/hydrogen/pull/2580)) by [@scottdixon](https://github.com/scottdixon)

- Updated dependencies [[`04b4c7c3`](https://github.com/Shopify/hydrogen/commit/04b4c7c3362aa07fc12ce749bfc5a955aa1254e4)]:
  - @shopify/mini-oxygen@3.0.6

## 8.4.4

### Patch Changes

- Update starter template with latest Hydrogen version. ([#2541](https://github.com/Shopify/hydrogen/pull/2541)) by [@scottdixon](https://github.com/scottdixon)

## 8.4.3

### Patch Changes

- Update starter template with latest Hydrogen version. ([#2535](https://github.com/Shopify/hydrogen/pull/2535)) by [@scottdixon](https://github.com/scottdixon)

## 8.4.2

### Patch Changes

- Update Shopify CLI and cli-kit dependencies to 3.66.1 ([#2512](https://github.com/Shopify/hydrogen/pull/2512)) by [@frandiox](https://github.com/frandiox)

- Add `--force-client-sourcemap` flag. Client sourcemapping is avoided by default because it makes backend code visible in the browser. Use this flag to force enabling it. ([#2477](https://github.com/Shopify/hydrogen/pull/2477)) by [@frandiox](https://github.com/frandiox)

  It is recommended to delete client sourcemaps before deploying the app to production.

- Updated dependencies [[`664a09d5`](https://github.com/Shopify/hydrogen/commit/664a09d57ef5d3c67da947a4e8546527c01e37c4), [`9dd4c615`](https://github.com/Shopify/hydrogen/commit/9dd4c615507f9f458f9d86db912d03fbefeed863)]:
  - @shopify/mini-oxygen@3.0.5

## 8.4.1

### Patch Changes

- Update starter template with latest Hydrogen version. ([#2432](https://github.com/Shopify/hydrogen/pull/2432)) by [@frandiox](https://github.com/frandiox)

- Fix upgrade notification right after scaffolding a new project. ([#2432](https://github.com/Shopify/hydrogen/pull/2432)) by [@frandiox](https://github.com/frandiox)

## 8.4.0

### Minor Changes

- Support `--env-file` in env:pull, dev, and preview commands to specify custom `.env` files. ([#2392](https://github.com/Shopify/hydrogen/pull/2392)) by [@frandiox](https://github.com/frandiox)

### Patch Changes

- Allow passing `customLogger` in `vite.config.js`. ([#2341](https://github.com/Shopify/hydrogen/pull/2341)) by [@frandiox](https://github.com/frandiox)

- Ignore `remix.config.js` file when `vite.config.js` is present, and warn about it. ([#2379](https://github.com/Shopify/hydrogen/pull/2379)) by [@frandiox](https://github.com/frandiox)

- Support special versions like `next` or `experimental` in CLI. ([#2417](https://github.com/Shopify/hydrogen/pull/2417)) by [@frandiox](https://github.com/frandiox)

## 8.3.0

### Minor Changes

- The Hydrogen CLI can now read the Codegen configuration from the GraphQL config file (e.g. `.graphqlrc.js` or `.graphqlrc.yml`). ([#2311](https://github.com/Shopify/hydrogen/pull/2311)) by [@frandiox](https://github.com/frandiox)

### Patch Changes

- Fix auth flow. ([#2331](https://github.com/Shopify/hydrogen/pull/2331)) by [@graygilmore](https://github.com/graygilmore)

## 8.2.0

### Minor Changes

- Support Vite projects in `h2 setup css` command to setup Tailwind and vanilla-extract. Drop CSS setup support for classic Remix projects. ([#2245](https://github.com/Shopify/hydrogen/pull/2245)) by [@frandiox](https://github.com/frandiox)

- The build process in Vite projects now generates a bundle analysis tool for the server files. ([#2138](https://github.com/Shopify/hydrogen/pull/2138)) by [@frandiox](https://github.com/frandiox)

### Patch Changes

- Fix Codegen config resolution when project directory contains dots. ([#2293](https://github.com/Shopify/hydrogen/pull/2293)) by [@frandiox](https://github.com/frandiox)

- [Bug fix] Allow env-branch to be passed when running `h2 deploy` in CI ([#2281](https://github.com/Shopify/hydrogen/pull/2281)) by [@aswamy](https://github.com/aswamy)

- Fix CLI upgrade notification when running from a global process. ([#2184](https://github.com/Shopify/hydrogen/pull/2184)) by [@frandiox](https://github.com/frandiox)

- skeleton template was updated to do session commit in server call instead of routes ([#2137](https://github.com/Shopify/hydrogen/pull/2137)) by [@michenly](https://github.com/michenly)

- Remove `PUBLIC_STORE_DOMAIN` environment variable from `.env` when creating new projects with mock.shop. ([#2221](https://github.com/Shopify/hydrogen/pull/2221)) by [@frandiox](https://github.com/frandiox)

- Added an `--auth-bypass-token-duration` flag to the `deploy` command to allow for specified token duration between 1 to 12 hours. ([#2182](https://github.com/Shopify/hydrogen/pull/2182)) by [@NelsonLee-Code](https://github.com/NelsonLee-Code)

- Updated dependencies [[`0924410f`](https://github.com/Shopify/hydrogen/commit/0924410fa2a1d13d46f09ca42fb1f1de3e0a4f57)]:
  - @shopify/mini-oxygen@3.0.4

## 8.1.0

### Minor Changes

- Support Vite projects in `h2 debug cpu` command. ([#2124](https://github.com/Shopify/hydrogen/pull/2124)) by [@frandiox](https://github.com/frandiox)

- The `h2 preview` command now supports `--build` and `--watch` flags to preview the project using the build process instead of Vite's dev process. ([#2100](https://github.com/Shopify/hydrogen/pull/2100)) by [@frandiox](https://github.com/frandiox)

### Patch Changes

- Update remix to v2.9.2 ([#2135](https://github.com/Shopify/hydrogen/pull/2135)) by [@michenly](https://github.com/michenly)

- The CLI now tries to add optimizable dependencies to Vite's ssr.optimizeDeps.include automatically. ([#2106](https://github.com/Shopify/hydrogen/pull/2106)) by [@frandiox](https://github.com/frandiox)

- Fix Hydrogen upgrade notification when running the dev command. ([#2120](https://github.com/Shopify/hydrogen/pull/2120)) by [@frandiox](https://github.com/frandiox)

- Hide non actionable warning about ts-node. ([#2123](https://github.com/Shopify/hydrogen/pull/2123)) by [@frandiox](https://github.com/frandiox)

- `<Analytics>` and `useAnalytics` are now stable. ([#2141](https://github.com/Shopify/hydrogen/pull/2141)) by [@wizardlyhel](https://github.com/wizardlyhel)

- Updated internal CLI dependencies to `3.60.0`. ([#2087](https://github.com/Shopify/hydrogen/pull/2087)) by [@isaacroldan](https://github.com/isaacroldan)

- Updated dependencies [[`cd888ec5`](https://github.com/Shopify/hydrogen/commit/cd888ec5ae5a0677aff7cd41962f5a44f155184e), [`27e51abf`](https://github.com/Shopify/hydrogen/commit/27e51abfc1f5444afa952c503886bfa12fc55c7e)]:
  - @shopify/mini-oxygen@3.0.3

## 8.0.4

### Patch Changes

- Fix `h2 upgrade` command to detect outdated devDependencies. ([#2093](https://github.com/Shopify/hydrogen/pull/2093)) by [@frandiox](https://github.com/frandiox)

- Avoid unhandled promise rejections when showing the upgrade notification. ([#2092](https://github.com/Shopify/hydrogen/pull/2092)) by [@frandiox](https://github.com/frandiox)

- Updated dependencies [[`72e6794e`](https://github.com/Shopify/hydrogen/commit/72e6794eb8c63d533b2a047b52111ff46f4fa641), [`1cd83113`](https://github.com/Shopify/hydrogen/commit/1cd83113550f798bc11aa1202b1e720489c9f49f), [`e9ea1891`](https://github.com/Shopify/hydrogen/commit/e9ea1891b4f9973150b5e174c3e429310d376903), [`ddc7196f`](https://github.com/Shopify/hydrogen/commit/ddc7196f3ffb44e2c5ee31a89ba95d7f6814fb89)]:
  - @shopify/mini-oxygen@3.0.2
  - @shopify/hydrogen-codegen@0.3.1

## 8.0.3

### Patch Changes

- Update internal `@shopify/cli-kit` dependency to fix React version mismatches. ([#2059](https://github.com/Shopify/hydrogen/pull/2059)) by [@frandiox](https://github.com/frandiox)

## 8.0.2

### Patch Changes

- Pin React dependency to 18.2.0 to avoid mismatches. ([#2051](https://github.com/Shopify/hydrogen/pull/2051)) by [@frandiox](https://github.com/frandiox)

## 8.0.1

### Patch Changes

- Clean up messaging around unlinked storefronts when running CLI commands ([#1937](https://github.com/Shopify/hydrogen/pull/1937)) by [@aswamy](https://github.com/aswamy)

  - When you run `env list`, `env pull`, or `deploy` against a storefront that isn't linked, it will show a warning message instead of an error message.
  - If you don't have a storefront to link to on Admin, we will just ask you to create a storefront instead of displaying an option list of size 1.
  - If you deleted a storefront on Admin, we will try to relink your storefront when running `env list`, `env pull`, or `deploy`.

- Add `@return` JSDoc tag to functions in JavaScript projects. ([#2014](https://github.com/Shopify/hydrogen/pull/2014)) by [@frandiox](https://github.com/frandiox)

- Fix `--quickstart` flag to support overwritting it with other flags. Example: `h2 init --quickstart --no-install-deps`. ([#2023](https://github.com/Shopify/hydrogen/pull/2023)) by [@frandiox](https://github.com/frandiox)

  Show error in `h2 debug cpu` command for Vite projects until we support it.

  Remove deprecated `--styling` flag from the `h2 init` command.

- Fix a warning when combining mock.shop and customer-account-push ([#1992](https://github.com/Shopify/hydrogen/pull/1992)) by [@frandiox](https://github.com/frandiox)

- Updated dependencies [[`7e8cf055`](https://github.com/Shopify/hydrogen/commit/7e8cf0558248e3bfd0f8299994e3ed2b91ee3d3b), [`a335afc1`](https://github.com/Shopify/hydrogen/commit/a335afc1026164132a618e8bcbbbf5d0fe27ae4c)]:
  - @shopify/mini-oxygen@3.0.1

## 8.0.0

### Major Changes

- Hydrogen CLI now requires `@shopify/mini-oxygen` to be installed separately as a dev dependency. It is still used automatically under the hood so there is no need to change your application code aside from installing the dependency. ([#1891](https://github.com/Shopify/hydrogen/pull/1891)) by [@frandiox](https://github.com/frandiox)

  Also, if a port provided via `--port` or `--inspector-port` flags is already in use, the CLI will now exit with an error message instead of finding a new open port. When the flags are not provided, the CLI will still find an open port.

### Minor Changes

- Move the Hydrogen CLI's `env push` command to stable. ([#1946](https://github.com/Shopify/hydrogen/pull/1946)) by [@aswamy](https://github.com/aswamy)

- Deprecate the `--env-branch` flag, in favor of `--env`. ([#1841](https://github.com/Shopify/hydrogen/pull/1841)) by [@aswamy](https://github.com/aswamy)

  - `--env` accepts the environment's handle, instead of the environment's associated branch name
    - Run `env list` to display all environments and their handles
  - Any CLI commands that accepted the `--env-branch` flag now accept the `--env` flag.

- Support scaffolding projects from external repositories using the `--template` flag. ([#1867](https://github.com/Shopify/hydrogen/pull/1867)) by [@frandiox](https://github.com/frandiox)

  The following examples are equivalent:

  ```sh
  npm create @shopify/hydrogen -- --template shopify/hydrogen-demo-store
  npm create @shopify/hydrogen -- --template github.com/shopify/hydrogen-demo-store
  npm create @shopify/hydrogen -- --template https://github.com/shopify/hydrogen-demo-store
  ```

- Add the `customer-account push` command to the Hydrogen CLI. This allows you to push the current `--dev-origin` URL to the Shopify admin to enable secure connection to the Customer Account API for local development. ([#1804](https://github.com/Shopify/hydrogen/pull/1804)) by [@michenly](https://github.com/michenly)

- Remove the `@shopify/cli-hydrogen/experimental-vite` import path in favor of `@shopify/hydrogen/vite` and `@shopify/mini-oxygen/vite`. ([#1935](https://github.com/Shopify/hydrogen/pull/1935)) by [@frandiox](https://github.com/frandiox)

### Patch Changes

- Avoid throwing error in `h2 dev --codegen` when the Customer Account schema is not found. ([#1962](https://github.com/Shopify/hydrogen/pull/1962)) by [@frandiox](https://github.com/frandiox)

- Bump internal workerd dependency to fix a bug when running on Node 21. ([#1866](https://github.com/Shopify/hydrogen/pull/1866)) by [@frandiox](https://github.com/frandiox)

- Support Node's `NODE_TLS_REJECT_UNAUTHORIZED` and `NODE_EXTRA_CA_CERTS` [environment variables](https://nodejs.org/api/cli.html#environment-variables) in the worker environment. ([#1882](https://github.com/Shopify/hydrogen/pull/1882)) by [@frandiox](https://github.com/frandiox)

  Use this at your own risk to disable certificate validation or provide additional CA certificates when making HTTPS requests from the worker:

  ```sh
  # Disable certificate validation
  NODE_TLS_REJECT_UNAUTHORIZED=0 npm run dev

  # Provide additional CA certificates
  NODE_EXTRA_CA_CERTS=/usr/.../ca-certificates/my-file.crt npm run dev
  ```

- Add `--quickstart` flag option to init/create command. ([#1822](https://github.com/Shopify/hydrogen/pull/1822)) by [@gfscott](https://github.com/gfscott)

- Add a newline after the `h2` alias created in ZSH/Bash profiles. ([#1950](https://github.com/Shopify/hydrogen/pull/1950)) by [@madmath](https://github.com/madmath)

- Fix the `--markets` flag when using `npm create @shopify/hydrogen`. ([#1916](https://github.com/Shopify/hydrogen/pull/1916)) by [@frandiox](https://github.com/frandiox)

- Handle duplicate storefront names when running `link` command. ([#1860](https://github.com/Shopify/hydrogen/pull/1860)) by [@gfscott](https://github.com/gfscott)

- List uncommitted files in the `deploy` command's "uncommitted changes" error message. ([#1944](https://github.com/Shopify/hydrogen/pull/1944)) by [@graygilmore](https://github.com/graygilmore)

- Improve `h2 setup vite` command to cover more migration steps (e.g. vanilla-extract, css-modules, etc.) and keep Remix future flags. ([#1915](https://github.com/Shopify/hydrogen/pull/1915)) by [@frandiox](https://github.com/frandiox)

- Add `--verbose` flag to `h2 dev` and `h2 preview` commands to enable verbose logging. ([#1928](https://github.com/Shopify/hydrogen/pull/1928)) by [@frandiox](https://github.com/frandiox)

  Only CLI logs become verbose by default. If you also want to see verbose logs from Vite as well, use `DEBUG=* h2 dev` instead.

- Updated dependencies [[`646b78d4`](https://github.com/Shopify/hydrogen/commit/646b78d4bc26310121b16000ed4d1c5d5e63957d), [`140e4768`](https://github.com/Shopify/hydrogen/commit/140e4768c880aaed4ba95b1d4c707df6963e011c), [`ebaf5529`](https://github.com/Shopify/hydrogen/commit/ebaf5529287b24a70b3146444b18f95b64f9f336)]:
  - @shopify/hydrogen-codegen@0.3.0
  - @shopify/mini-oxygen@3.0.0

## 7.1.2

### Patch Changes

- Change the required Vite version to `~5.1.0` instead of `^5.1.0` to avoid breaking changes in experimental APIs that will be introduced in Vite 5.2.0. ([#1830](https://github.com/Shopify/hydrogen/pull/1830)) by [@frandiox](https://github.com/frandiox)

## 7.1.1

### Patch Changes

- Update `@shopify/cli-kit` dependency to `3.56.3` and improve some help messaging. ([#1786](https://github.com/Shopify/hydrogen/pull/1786)) by [@frandiox](https://github.com/frandiox)

- Hide a non-actionable warning about a deprecated Node.js module `punycode`. ([#1801](https://github.com/Shopify/hydrogen/pull/1801)) by [@frandiox](https://github.com/frandiox)

- Add experimental support for Vite projects. ([#1728](https://github.com/Shopify/hydrogen/pull/1728)) by [@frandiox](https://github.com/frandiox)

  To test this unstable feature, make sure you're running the latest version of the Hydrogen CLI, then run `npx shopify hydrogen setup vite` in your Hydrogen project. This command edits existing files and creates some new ones required to run Vite.

  Please report [any issues you run into](https://github.com/Shopify/hydrogen/issues/new?assignees=&labels=bug%3Aunverified&projects=&template=bug_report.yml), and let us know if you have any feedback or suggestions.

- Fix an issue that could cause the local worker runtime to freeze. ([#1819](https://github.com/Shopify/hydrogen/pull/1819)) by [@frandiox](https://github.com/frandiox)

- Updated dependencies [[`4e3d5b00`](https://github.com/Shopify/hydrogen/commit/4e3d5b005941db9a6d8eb2a5d7edf23148d60b07)]:
  - @shopify/hydrogen-codegen@0.2.2

## 7.1.0

### Minor Changes

- Adds new command line flag options for the `deploy` command: ([#1736](https://github.com/Shopify/hydrogen/pull/1736)) by [@vincentezw](https://github.com/vincentezw)

  - `build-command`: Allows users to specify which command is used to build the project (instead of the default build function). This provides more flexibility for projects that have custom build processes.
  - `no-lockfile-check`: Allows users to skip the lockfile check during the build process. This can be useful in scenarios where you want to bypass the lockfile check for certain reasons, such as in monorepos, where the lockfile resides in the root folder.

- Adding skip-verification flag to hydrogen deploy command ([#1770](https://github.com/Shopify/hydrogen/pull/1770)) by [@lynchv](https://github.com/lynchv)

### Patch Changes

- Add `--env-file` flag to the `deploy` command ([#1743](https://github.com/Shopify/hydrogen/pull/1743)) by [@aswamy](https://github.com/aswamy)

  Optionally provide the path to a local .env file to override the environment variables set on Admin.

- This is an important fix to a bug with 404 routes and path-based i18n projects where some unknown routes would not properly render a 404. This fixes all new projects, but to fix existing projects, add a `($locale).tsx` route with the following contents: ([#1732](https://github.com/Shopify/hydrogen/pull/1732)) by [@blittle](https://github.com/blittle)

  ```ts
  import {type LoaderFunctionArgs} from '@remix-run/server-runtime';

  export async function loader({params, context}: LoaderFunctionArgs) {
    const {language, country} = context.storefront.i18n;

    if (
      params.locale &&
      params.locale.toLowerCase() !== `${language}-${country}`.toLowerCase()
    ) {
      // If the locale URL param is defined, yet we still are still at the default locale
      // then the the locale param must be invalid, send to the 404 page
      throw new Response(null, {status: 404});
    }

    return null;
  }
  ```

- Non-zero exit codes are now honored ([#1766](https://github.com/Shopify/hydrogen/pull/1766)) by [@graygilmore](https://github.com/graygilmore)

## 7.0.1

### Patch Changes

- Add support for multiple schemas in GraphiQL. Fix links in Subrequest Profiler. ([#1693](https://github.com/Shopify/hydrogen/pull/1693)) by [@frandiox](https://github.com/frandiox)

- ♻️ `CustomerClient` type is deprecated and replaced by `CustomerAccount` ([#1692](https://github.com/Shopify/hydrogen/pull/1692)) by [@michenly](https://github.com/michenly)

- Skip prompt about creating `h2` shortcut during init flow if it has been already added to the environment. ([#1718](https://github.com/Shopify/hydrogen/pull/1718)) by [@gfscott](https://github.com/gfscott)

- Bump Codegen dependencies to fix known bugs and remove patches. ([#1705](https://github.com/Shopify/hydrogen/pull/1705)) by [@frandiox](https://github.com/frandiox)

- Fix local asset path to Oxygen to return valid preflight headers ([#1709](https://github.com/Shopify/hydrogen/pull/1709)) by [@wizardlyhel](https://github.com/wizardlyhel)

- Updated dependencies [[`c7b2017f`](https://github.com/Shopify/hydrogen/commit/c7b2017f11a2cb4d280dfd8f170e65a908b9ea02)]:
  - @shopify/hydrogen-codegen@0.2.1

## 7.0.0

### Major Changes

- Make the worker runtime the default for the local development server when running `dev` and `preview`. To access the legacy Node.js runtime, pass the `--legacy-runtime` flag. The legacy runtime will be deprecated and removed in a future release. ([#1625](https://github.com/Shopify/hydrogen/pull/1625)) by [@frandiox](https://github.com/frandiox)

- Remove deprecated `build` command flags `--base`, `--entry`, `--target`. Additionally, `--codegen-unstable` is now `--codegen`. ([#1640](https://github.com/Shopify/hydrogen/pull/1640)) by [@frandiox](https://github.com/frandiox)

### Minor Changes

- Check for local project GraphQL config files (example: `.graphqlrc.yml`) when running in Codegen mode ([#1577](https://github.com/Shopify/hydrogen/pull/1577)) by [@frandiox](https://github.com/frandiox)

- Add `deploy` command to Hydrogen CLI ([#1628](https://github.com/Shopify/hydrogen/pull/1628)) by [@graygilmore](https://github.com/graygilmore)

  You can now deploy your Hydrogen app without connecting to GitHub. Run the `deploy` command from your local terminal or configure your own CI/CD workflows from any platform.

  Run `npx shopify hydrogen deploy --help` for more details.

- Add `--diff` flag to `dev` and `build` commands, used for building Hydrogen app examples. ([#1549](https://github.com/Shopify/hydrogen/pull/1549)) by [@frandiox](https://github.com/frandiox)

- Add `--template` flag to enable scaffolding projects based on [examples](https://github.com/Shopify/hydrogen/tree/main/examples) from the Hydrogen repo. ([#1608](https://github.com/Shopify/hydrogen/pull/1608)) by [@frandiox](https://github.com/frandiox)

  Example: `npm create @shopify/hydrogen@latest -- --template multipass`.

### Patch Changes

- Reorganize starter template file and folder structure ([#1612](https://github.com/Shopify/hydrogen/pull/1612)) by [@frandiox](https://github.com/frandiox)

- Fix step-debugging when running in the Node.js sandbox ([#1501](https://github.com/Shopify/hydrogen/pull/1501)) by [@frandiox](https://github.com/frandiox)

- Generate sourcemaps by default when running the `deploy` command ([#1623](https://github.com/Shopify/hydrogen/pull/1623)) by [@blittle](https://github.com/blittle)

- Remove bundle-size check from the `build` command, in favor of checking server-side with `deploy` ([#1614](https://github.com/Shopify/hydrogen/pull/1614)) by [@benwolfram](https://github.com/benwolfram)

- - Update example and template Remix versions to `^2.5.1` ([#1639](https://github.com/Shopify/hydrogen/pull/1639)) by [@wizardlyhel](https://github.com/wizardlyhel)

  - Enable Remix future flags:
    - [`v3_fetcherPersist`](https://remix.run/docs/en/main/hooks/use-fetchers#additional-resources)
    - [`v3_relativeSplatpath`](https://remix.run/docs/en/main/hooks/use-resolved-path#splat-paths)

- Add the option to create a new storefront when running the `init` command ([#1681](https://github.com/Shopify/hydrogen/pull/1681)) by [@aswamy](https://github.com/aswamy)

- Updated dependencies [[`0241b7d2`](https://github.com/Shopify/hydrogen/commit/0241b7d2dcb887d259ce9033aca356d391bc07df), [`9ad7c5ef`](https://github.com/Shopify/hydrogen/commit/9ad7c5efee8bff63760b36a1a7c194f6bb8e07e5)]:
  - @shopify/mini-oxygen@2.2.5
  - @shopify/hydrogen-codegen@0.2.0

## 6.1.0

### Minor Changes

- Add the [`upgrade` command](https://h2o.fyi/cli#upgrade) to make it easier to upgrade from older versions of Hydrogen. Features: ([#1458](https://github.com/Shopify/hydrogen/pull/1458)) by [@juanpprieto](https://github.com/juanpprieto)

  - Automatically updates dependencies in your package.json file.
  - Generates a customized instruction file in the `/.shopify` directory, outlining any code changes required to complete the upgrade.
  - Adds a warning when running the `dev` command with an outdated version.
  - Defaults to the latest version. Pass a `--version` flag and a version number to select a specific one.

  To get started, run `npx shopify hydrogen upgrade` in your Hydrogen project.

- The worker runtime for development is now stable. This makes your development environment closer to parity with Oxygen’s production runtime. Pass the `--worker` flag with the `dev` or `preview` commands to enable it. This runtime will be enabled by default in the next major release. ([#1525](https://github.com/Shopify/hydrogen/pull/1525)) by [@frandiox](https://github.com/frandiox)

- Add the `--debug` flag to the [`dev` command](https://h2o.fyi/cli#dev) to enable step debugging in browser dev tools. ([#1480](https://github.com/Shopify/hydrogen/pull/1480)) by [@frandiox](https://github.com/frandiox)

  To enable debugger connections for the Hydrogen app worker file, run `npx shopify hydrogen dev --debug --worker`, then open [localhost:9229](http://localhost:9229) in your browser.

### Patch Changes

- Sync up environment variable names across all example & type files. ([#1542](https://github.com/Shopify/hydrogen/pull/1542)) by [@michenly](https://github.com/michenly)

- Serve assets from a separate domain when running the dev server, to better simulate cross-domain behaviors. This makes it more realistic to work with CORS requests, content security policies, and CDN paths in development. ([#1503](https://github.com/Shopify/hydrogen/pull/1503)) by [@frandiox](https://github.com/frandiox)

- Update all Node.js dependencies to version 18. (Not a breaking change, since Node.js 18 is already required by Remix v2.) ([#1543](https://github.com/Shopify/hydrogen/pull/1543)) by [@michenly](https://github.com/michenly)

- 🐛 fix undefined menu error ([#1533](https://github.com/Shopify/hydrogen/pull/1533)) by [@michenly](https://github.com/michenly)

- Fix how peer dependencies are resolved. ([#1489](https://github.com/Shopify/hydrogen/pull/1489)) by [@frandiox](https://github.com/frandiox)

- Update Shopify CLI versions. ([#1504](https://github.com/Shopify/hydrogen/pull/1504)) by [@vincentezw](https://github.com/vincentezw)

- Updated dependencies [[`848c6260`](https://github.com/Shopify/hydrogen/commit/848c6260a2db3a9cb0c86351f0f7128f61e028f0), [`8fce70de`](https://github.com/Shopify/hydrogen/commit/8fce70de32bd61ee86a6d895ac43cc1f78f1bf49)]:
  - @shopify/mini-oxygen@2.2.4

## 6.0.2

### Patch Changes

- Updated dependencies [[`69624b32`](https://github.com/Shopify/hydrogen/commit/69624b3276fa18a654e222db226c7403ebdc8ead)]:
  - @shopify/hydrogen@2023.10.2

## 6.0.1

### Patch Changes

- Fix Shopify login during the init flow where the process would just exit when awaiting for a keypress. ([#1481](https://github.com/Shopify/hydrogen/pull/1481)) by [@frandiox](https://github.com/frandiox)

- Updated dependencies [[`074ef6e8`](https://github.com/Shopify/hydrogen/commit/074ef6e88412dc4f731c253f1dcd27cb73afcc3c)]:
  - @shopify/hydrogen@2023.10.1

## 6.0.0

### Minor Changes

- The Codegen feature is now considered stable and related dependencies have been updated. Use `--codegen` flag instead of `--codegen-unstable` to generate code from your GraphQL queries. ([#1108](https://github.com/Shopify/hydrogen/pull/1108)) by [@frandiox](https://github.com/frandiox)

### Patch Changes

- Updated internal dependencies to improve terminal output. ([#1456](https://github.com/Shopify/hydrogen/pull/1456)) by [@vincentezw](https://github.com/vincentezw)

  Please update the `@shopify/cli` dependency in your app to avoid duplicated subdependencies:

  ```diff
    "dependencies": {
  -   "@shopify/cli": "3.49.2",
  +   "@shopify/cli": "3.50.0",
    }
  ```

- Updated dependencies [[`a6f397b6`](https://github.com/Shopify/hydrogen/commit/a6f397b64dc6a0d856cb7961731ee1f86bf80292), [`ad45656c`](https://github.com/Shopify/hydrogen/commit/ad45656c5f663cc1a60eab5daab4da1dfd0e6cc3), [`ad45656c`](https://github.com/Shopify/hydrogen/commit/ad45656c5f663cc1a60eab5daab4da1dfd0e6cc3), [`58dc68de`](https://github.com/Shopify/hydrogen/commit/58dc68de2f71d12f1275961e160faa740387cdb5), [`0ae7cbe2`](https://github.com/Shopify/hydrogen/commit/0ae7cbe280d8351126e11dc13f35d7277d9b2d86), [`ad45656c`](https://github.com/Shopify/hydrogen/commit/ad45656c5f663cc1a60eab5daab4da1dfd0e6cc3)]:
  - @shopify/remix-oxygen@2.0.0
  - @shopify/hydrogen-codegen@0.1.0
  - @shopify/hydrogen-react@2023.10.0

## 5.5.1

### Patch Changes

- Fix template dist package due to CI error ([#1451](https://github.com/Shopify/hydrogen/pull/1451)) by [@wizardlyhel](https://github.com/wizardlyhel)

- Updated dependencies [[`3eb376fe`](https://github.com/Shopify/hydrogen/commit/3eb376fe8796b50131dc43845772ae555e07a1a6)]:
  - @shopify/hydrogen-react@2023.7.6

## 5.5.0

### Minor Changes

- Generated JavaScript projects now use Codegen and JSDoc to enhance editor autocompletion. ([#1334](https://github.com/Shopify/hydrogen/pull/1334)) by [@frandiox](https://github.com/frandiox)

- We've added an experimental tool for profiling the CPU at startup. This is useful for debugging slow startup times when Oxygen deployments fail with related errors. ([#1352](https://github.com/Shopify/hydrogen/pull/1352)) by [@frandiox](https://github.com/frandiox)

  Run the new `h2 debug cpu` command to build + watch your app and generate a `startup.cpuprofile` file that you can open in DevTools or VSCode to see a flamegraph of CPU usage.

### Patch Changes

- Integrate the debug-network tooling with the new `--worker-unstable` runtime CLI flag. ([#1387](https://github.com/Shopify/hydrogen/pull/1387)) by [@frandiox](https://github.com/frandiox)

- Updated dependencies [[`d30e2651`](https://github.com/Shopify/hydrogen/commit/d30e265180e7856d2257d8cad0bd067c8a91e9cc), [`b81b452d`](https://github.com/Shopify/hydrogen/commit/b81b452d010c650b1de1678f729945d1d4394820), [`1b45311d`](https://github.com/Shopify/hydrogen/commit/1b45311d28b2ca941c479a1896efa89a9b71bec1), [`2627faa7`](https://github.com/Shopify/hydrogen/commit/2627faa7f09ba306506bb206d4d6624de5691961)]:
  - @shopify/hydrogen-react@2023.7.5
  - @shopify/remix-oxygen@1.1.8

## 5.4.3

### Patch Changes

- Fix subrequest performance in development. ([#1411](https://github.com/Shopify/hydrogen/pull/1411)) by [@frandiox](https://github.com/frandiox)

- Increase the request body size limit to 100mb when running locally. ([#1421](https://github.com/Shopify/hydrogen/pull/1421)) by [@frandiox](https://github.com/frandiox)

- Updated dependencies [[`29414664`](https://github.com/Shopify/hydrogen/commit/294146644df57592a775ae33cdf4359015155d72), [`832a0eaf`](https://github.com/Shopify/hydrogen/commit/832a0eafad331f61b7cfdf90dec6427f1aaaef6b)]:
  - @shopify/remix-oxygen@1.1.7
  - @shopify/mini-oxygen@2.2.3

## 5.4.2

### Patch Changes

- Fix product search results header style ([#1405](https://github.com/Shopify/hydrogen/pull/1405)) by [@tatsuya](https://github.com/tatsuya)

- Updated dependencies [[`4f735fd7`](https://github.com/Shopify/hydrogen/commit/4f735fd725aef26cd3bd5b50c87d2c028b93c598)]:
  - @shopify/remix-oxygen@1.1.6

## 5.4.1

### Patch Changes

- Add token flag, environmentTag flag, environment selection screen, rename health check to deployment verification ([#1381](https://github.com/Shopify/hydrogen/pull/1381)) by [@vincentezw](https://github.com/vincentezw)

- Updated dependencies [[`eb9451ed`](https://github.com/Shopify/hydrogen/commit/eb9451ed7883f610d1412bdab2553523859ac701)]:
  - @shopify/remix-oxygen@1.1.5

## 5.4.0

### Minor Changes

- The build command now throws errors on CI when it can't find a valid lockfile. This should prevent unforseen issues related to dependency versioning in production. ([#1370](https://github.com/Shopify/hydrogen/pull/1370)) by [@frandiox](https://github.com/frandiox)

  This behavior can be disabled with the flag `--no-lockfile-check`, which might be useful in monorepos or other setups where the lockfile is not available in the project directory.

### Patch Changes

- Add check to render collection images when available ([#1373](https://github.com/Shopify/hydrogen/pull/1373)) by [@juanpprieto](https://github.com/juanpprieto)

- Remove sourcemap annotations from client bundles. This prevents errors showing up in the devtools when the sourcemaps fail to load. ([#1364](https://github.com/Shopify/hydrogen/pull/1364)) by [@blittle](https://github.com/blittle)

## 5.3.1

### Patch Changes

- Make the CLI bundle analysis compatible with older Remix versions that don't output a metafile ([#1357](https://github.com/Shopify/hydrogen/pull/1357)) by [@blittle](https://github.com/blittle)

## 5.3.0

### Minor Changes

- Add `--worker-unstable` flag to `h2 dev` and `h2 preview` commands. This flag enables the use of the new experimental worker runtime for local development, which is closer to Oxygen production than the current Node.js sandbox. Please report any issues you encounter with this flag. ([#1184](https://github.com/Shopify/hydrogen/pull/1184)) by [@frandiox](https://github.com/frandiox)

- Add deploy command (disabled by default) ([#1019](https://github.com/Shopify/hydrogen/pull/1019)) by [@vincentezw](https://github.com/vincentezw)

### Patch Changes

- Add magic cart and discount routes to skeleton template ([#1309](https://github.com/Shopify/hydrogen/pull/1309)) by [@juanpprieto](https://github.com/juanpprieto)

- Updates placeholder page to suggest the `h2 setup` command, instead of `h2 generate route home` ([#1347](https://github.com/Shopify/hydrogen/pull/1347)) by [@benjaminsehl](https://github.com/benjaminsehl)

- Adjust behavior of `h2 preview` command around environment variables to be more consistent with `h2 dev` command. ([#1184](https://github.com/Shopify/hydrogen/pull/1184)) by [@frandiox](https://github.com/frandiox)

- We've added a tool for analyzing bundle sizes. You should try to keep your worker bundle small. The larger it gets effects the cold startup time of your app. We now include `client-bundle-analyzer.html` and `worker-bundle-analyzer.html` files in the build output. Open these in your browser to view an interactive analysis of your bundles. The CLI output also includes links to each file. Hydrogen also fails to build if your bundle size is over 10 MB. This is because Oxygen only supports worker bundles less than 10 MB. ([#1306](https://github.com/Shopify/hydrogen/pull/1306)) by [@blittle](https://github.com/blittle)

- Raise the subrequest limit to 100 for development. ([#1348](https://github.com/Shopify/hydrogen/pull/1348)) by [@frandiox](https://github.com/frandiox)

- Fix `--routes` and `--markets` flag when creating new projects. ([#1342](https://github.com/Shopify/hydrogen/pull/1342)) by [@frandiox](https://github.com/frandiox)

- Make sourcemaps to default be turned on. They were off to prevent sourcemaps leaking server code to the client. Oxygen now makes sure to not serve the sourcemaps, so it's okay to generate them. Also, when sourcemaps are present, we hope to enable sourcemapped stack traces in error logs on Oxygen. ([#1339](https://github.com/Shopify/hydrogen/pull/1339)) by [@blittle](https://github.com/blittle)

## 5.2.3

### Patch Changes

- Delay installing certain dependencies to speed up project initialization time. ([#1272](https://github.com/Shopify/hydrogen/pull/1272)) by [@frandiox](https://github.com/frandiox)

- (Unstable) server-side network request debug virtual route ([#1284](https://github.com/Shopify/hydrogen/pull/1284)) by [@wizardlyhel](https://github.com/wizardlyhel)

  1. Update your `server.ts` so that it also passes in the `waitUntil` and `env`.

     ```diff
       const handleRequest = createRequestHandler({
         build: remixBuild,
         mode: process.env.NODE_ENV,
     +    getLoadContext: () => ({session, storefront, env, waitUntil}),
       });
     ```

     If you are using typescript, make sure to update `remix.env.d.ts`

     ```diff
       declare module '@shopify/remix-oxygen' {
         export interface AppLoadContext {
     +     env: Env;
           cart: HydrogenCart;
           storefront: Storefront;
           session: HydrogenSession;
     +      waitUntil: ExecutionContext['waitUntil'];
         }
       }
     ```

  2. Run `npm run dev` and you should see terminal log information about a new virtual route that you can view server-side network requests at http://localhost:3000/debug-network

  3. Open http://localhost:3000/debug-network in a tab and your app another tab. When you navigate around your app, you should see server network requests being logged in the debug-network tab

- Updated dependencies [[`71a07374`](https://github.com/Shopify/hydrogen/commit/71a0737438d51bae79330d3251f47355e814a453)]:
  - @shopify/remix-oxygen@1.1.4

## 5.2.2

### Patch Changes

- Fix error stack traces in development mode. ([#1297](https://github.com/Shopify/hydrogen/pull/1297)) by [@frandiox](https://github.com/frandiox)

- Updated dependencies [[`345f06a2`](https://github.com/Shopify/hydrogen/commit/345f06a27886eceaf1ea6b75971c1130b059e2db)]:
  - @shopify/hydrogen-react@2023.7.4

## 5.2.1

### Patch Changes

- Fix the default page shown when the project has no routes. ([#1266](https://github.com/Shopify/hydrogen/pull/1266)) by [@frandiox](https://github.com/frandiox)

- Hydrogen is now compatible with TypeScript v5. ([#1240](https://github.com/Shopify/hydrogen/pull/1240)) by [@frandiox](https://github.com/frandiox)

  If you have `typescript` as a dev dependency in your app, it is recommended to change its version as follows:

  ```diff
    "devDependencies": {
      ...
  -   "typescript": "^4.9.5",
  +   "typescript": "^5.2.2",
    },
  ```

  After installing the new version of TypeScript, you may need to update the version used in your IDE. For example, in VSCode, you can do this by clicking on the `{ }` icon in the bottom-right toolbar next to the language mode (generally, `{ } TypeScript JSX` when editing a `.tsx` file).

- Fix development server port in some situations where it was set to a random number instead of the default 3000 or the `--port` flag value. ([#1267](https://github.com/Shopify/hydrogen/pull/1267)) by [@frandiox](https://github.com/frandiox)

- Fix transpiling TS to JS when scaffolding routes. ([#1273](https://github.com/Shopify/hydrogen/pull/1273)) by [@frandiox](https://github.com/frandiox)

- Catch more errors during init while connecting to Shopify ([#1281](https://github.com/Shopify/hydrogen/pull/1281)) by [@graygilmore](https://github.com/graygilmore)

- Add functionality for creating a Content Security Policy. See the [guide on Content Security Policies](https://shopify.dev/docs/custom-storefronts/hydrogen/content-security-policy) for more details. ([#1235](https://github.com/Shopify/hydrogen/pull/1235)) by [@blittle](https://github.com/blittle)

- Updated dependencies [[`06516ee9`](https://github.com/Shopify/hydrogen/commit/06516ee91f20153902c2b8ef79c0f6690ba385bb), [`423acee2`](https://github.com/Shopify/hydrogen/commit/423acee243c62e49a865ff2cd82735991aca1d8f)]:
  - @shopify/hydrogen-react@2023.7.3

## 5.2.0

### Minor Changes

- Support Remix Hot Module Replacement (HMR) and Hot Data Revalidation (HDR). ([#1187](https://github.com/Shopify/hydrogen/pull/1187)) by [@frandiox](https://github.com/frandiox)

  Start using it with the following changes to your project:

  1. Upgrade to the latest Hydrogen version and Remix 1.19.1.

  2. Enable the v2 dev server in `remix.config.js`:

  ```diff
  // ...
  future: {
  + v2_dev: true,
    v2_meta: true,
    v2_headers: true,
    // ...
  }
  ```

  3. Add Remix' `<LiveReload />` component if you don't have it to your `root.jsx` or `root.tsx` file:

  ```diff
  import {
    Outlet,
    Scripts,
  + LiveReload,
    ScrollRestoration,
  } from '@remix-run/react';

  // ...

  export default function App() {
    // ...

    return (
      <html>
        <head>
         {/* ...  */}
        </head>
        <body>
          <Outlet />
          <ScrollRestoration />
          <Scripts />
  +       <LiveReload />
        </body>
      </html>
    );
  }

  export function ErrorBoundary() {
    // ...

    return (
      <html>
        <head>
          {/* ... */}
        </head>
        <body>
          Error!
          <Scripts />
  +       <LiveReload />
        </body>
      </html>
    );
  }
  ```

### Patch Changes

- Avoid development server crash on unhandled promise rejection. ([#1244](https://github.com/Shopify/hydrogen/pull/1244)) by [@frandiox](https://github.com/frandiox)

- Fix build command when `public` directory is missing. ([#1224](https://github.com/Shopify/hydrogen/pull/1224)) by [@frandiox](https://github.com/frandiox)

- Use nonce from CSP header in MiniOxygen's auto-reload script. ([#1251](https://github.com/Shopify/hydrogen/pull/1251)) by [@frandiox](https://github.com/frandiox)

- Add default exported route to enable the error to be caught in the root.tsx ErrorBoundary ([#1215](https://github.com/Shopify/hydrogen/pull/1215)) by [@josh-sanger](https://github.com/josh-sanger)

- Improve error handling when failing to get remote environment variables. ([#1225](https://github.com/Shopify/hydrogen/pull/1225)) by [@frandiox](https://github.com/frandiox)

- Fix GraphQL Codegen throwing error related to Git on Windows. ([#1253](https://github.com/Shopify/hydrogen/pull/1253)) by [@frandiox](https://github.com/frandiox)

- Add shouldRevalidate export to limit root loaders revalidation on mutations only ([#1237](https://github.com/Shopify/hydrogen/pull/1237)) by [@juanpprieto](https://github.com/juanpprieto)

- Removed quantityAvailable field from skeleton PDP graphql query so that it works with default Storefront API permissions. ([#1236](https://github.com/Shopify/hydrogen/pull/1236)) by [@abecciu](https://github.com/abecciu)

- Updated dependencies [[`e9e1736a`](https://github.com/Shopify/hydrogen/commit/e9e1736ace6bd981e8109e38402eb405f7c865c1), [`1a0e858d`](https://github.com/Shopify/hydrogen/commit/1a0e858d94ea7d14f3f37ca32d288b33436038b0)]:
  - @shopify/hydrogen-react@2023.7.2

## 5.1.2

### Patch Changes

- Update @shopify/oxygen-workers-types dependencies ([#1208](https://github.com/Shopify/hydrogen/pull/1208)) by [@juanpprieto](https://github.com/juanpprieto)

- Updated dependencies [[`21eb9dac`](https://github.com/Shopify/hydrogen/commit/21eb9dac935722fd8d0d385b00c3bbcfb4693baa), [`d80c4ada`](https://github.com/Shopify/hydrogen/commit/d80c4ada051dd5530c12720cb7d8e8c6dda19c98)]:
  - @shopify/remix-oxygen@1.1.3
  - @shopify/hydrogen-react@2023.7.1

## 5.1.1

### Patch Changes

- Update to Remix v1.19.1. ([#1172](https://github.com/Shopify/hydrogen/pull/1172)) by [@frandiox](https://github.com/frandiox)

  See changes for [1.18](https://github.com/remix-run/remix/releases/tag/remix%401.18.0) and [1.19](https://github.com/remix-run/remix/releases/tag/remix%401.19.0).

- Fix the starter template cart aside to cover everything on larger pages ([#1163](https://github.com/Shopify/hydrogen/pull/1163)) by [@QuentinGibson](https://github.com/QuentinGibson)

- Skip Oxygen requirement checks of `remix.config.js` when `@shopify/remix-oxygen` is not installed. ([#1137](https://github.com/Shopify/hydrogen/pull/1137)) by [@frandiox](https://github.com/frandiox)

- Warn in development when Remix packages are out of sync. ([#1173](https://github.com/Shopify/hydrogen/pull/1173)) by [@frandiox](https://github.com/frandiox)

- Updated dependencies [[`b7a8ecf6`](https://github.com/Shopify/hydrogen/commit/b7a8ecf6a687e72de7745a78c61c1a78a9a52629)]:
  - @shopify/remix-oxygen@1.1.2

## 5.1.0

### What’s new

⭐️ Check out our [blog post](https://hydrogen.shopify.dev/updates) with all the latest updates on Hydrogen, and what’s coming on the roadmap.

Shopify CLI now gives you [more options](https://shopify.dev/docs/custom-storefronts/hydrogen/getting-started/quickstart) when creating a new Hydrogen app on the command line:

- Create a new Shopify storefront and connect it to the local project, or use [Mock.shop](https://mock.shop).
- Pick your styling method: Tailwind, CSS Modules, Vanilla Extract, PostCSS.
- URL strategies to support language and currency options with Shopify Markets.
- Automatically scaffold standard Shopify routes.

### Minor Changes

- The onboarding process when creating new Hydrogen apps has been reworked. ([#913](https://github.com/Shopify/hydrogen/pull/913)) by [@frandiox](https://github.com/frandiox)

- Add `login` and `logout` commands. Rework how other commands interact with auth. ([#1022](https://github.com/Shopify/hydrogen/pull/1022)) by [@frandiox](https://github.com/frandiox)

- Reload environment variables in the development server when `.env` file is updated. Show injected variables when project is not linked to any storefront. ([#997](https://github.com/Shopify/hydrogen/pull/997)) by [@frandiox](https://github.com/frandiox)

- Support creating new storefronts from the `link` command. ([#1022](https://github.com/Shopify/hydrogen/pull/1022)) by [@frandiox](https://github.com/frandiox)

### Patch Changes

- Stop checking `/products` and `/discount` routes in `h2 check routes` command. ([#1141](https://github.com/Shopify/hydrogen/pull/1141)) by [@frandiox](https://github.com/frandiox)

- Show proper error message when Hydrogen App isn't installed on Shop ([#1075](https://github.com/Shopify/hydrogen/pull/1075)) by [@aswamy](https://github.com/aswamy)

- Improve warning and error format for known Hydrogen messages in development. ([#1093](https://github.com/Shopify/hydrogen/pull/1093)) by [@frandiox](https://github.com/frandiox)

- Add `--codegen-unstable` flag to `build` command. ([#1049](https://github.com/Shopify/hydrogen/pull/1049)) by [@frandiox](https://github.com/frandiox)

- Updated dependencies [[`c39411e0`](https://github.com/Shopify/hydrogen/commit/c39411e0454750697d580a1ef4858800c494980f), [`0d2e5ffb`](https://github.com/Shopify/hydrogen/commit/0d2e5ffb68096f1dc48ade8793e6ef53088af6da), [`4bee03df`](https://github.com/Shopify/hydrogen/commit/4bee03df3cc8203510f6b05522c1268aa5e5f2f4), [`11ab64a8`](https://github.com/Shopify/hydrogen/commit/11ab64a88966dd7b90522f15836abfff6f5d595f), [`7a7456a5`](https://github.com/Shopify/hydrogen/commit/7a7456a5ab073559aef37f043e8aa47570639b96)]:
  - @shopify/hydrogen-react@2023.4.6

## 5.0.2

### Patch Changes

- Add more context on MiniOxygen local dev server startup ([#1005](https://github.com/Shopify/hydrogen/pull/1005)) by [@gfscott](https://github.com/gfscott)

- Fix `--sourcemap` flag for build command. ([#1032](https://github.com/Shopify/hydrogen/pull/1032)) by [@frandiox](https://github.com/frandiox)

- Fix `dev --codegen-unstable` flag, which was removed by mistake in the previous release. ([#1018](https://github.com/Shopify/hydrogen/pull/1018)) by [@frandiox](https://github.com/frandiox)

- Updated dependencies [[`b8f41ad7`](https://github.com/Shopify/hydrogen/commit/b8f41ad7174056f304301022a2aa77cecfdf0824)]:
  - @shopify/hydrogen-react@2023.4.5

## 5.0.1

### Patch Changes

- Update Remix to the latest version (`1.17.1`). ([#852](https://github.com/Shopify/hydrogen/pull/852)) by [@frandiox](https://github.com/frandiox)

  When updating your app, remember to also update your Remix dependencies to `1.17.1` in your `package.json` file:

  ```diff
  -"@remix-run/react": "1.15.0",
  +"@remix-run/react": "1.17.1",

  -"@remix-run/dev": "1.15.0",
  -"@remix-run/eslint-config": "1.15.0",
  +"@remix-run/dev": "1.17.1",
  +"@remix-run/eslint-config": "1.17.1",
  ```

- Updated dependencies [[`f29e178a`](https://github.com/Shopify/hydrogen/commit/f29e178ada608ef3797c5049fd498afeed272152)]:
  - @shopify/remix-oxygen@1.1.1

## 5.0.0

### Patch Changes

- Remove `--codegen-unstable` flag from scripts when transpiling projects from TypeScript to JavaScript. ([#937](https://github.com/Shopify/hydrogen/pull/937)) by [@frandiox](https://github.com/frandiox)

- Allow disabling sourcemaps with `shopify hydrogen build --no-sourcemap` ([#975](https://github.com/Shopify/hydrogen/pull/975)) by [@blittle](https://github.com/blittle)

- Allow the CLI route generate to work in non-oxygen deploys ([#976](https://github.com/Shopify/hydrogen/pull/976)) by [@blittle](https://github.com/blittle)

- Hidden flag removed from new CLI commands ([#995](https://github.com/Shopify/hydrogen/pull/995)) by [@graygilmore](https://github.com/graygilmore)

  You can now link your local Hydrogen storefront to a storefront you have created in the Shopify admin. This allows you to pull your environment variables into your local environment or have them be automatically injected into your runtime when you run `dev`.

- Updated dependencies [[`7b4afea2`](https://github.com/Shopify/hydrogen/commit/7b4afea29a050f9c77482540e321d9bc60351b2e), [`32515232`](https://github.com/Shopify/hydrogen/commit/32515232aa03077b542f5fcf95f38a715af09327), [`7d6a1a7c`](https://github.com/Shopify/hydrogen/commit/7d6a1a7cd3adb6ee0cf4cf242b72d5650509639b), [`442f602a`](https://github.com/Shopify/hydrogen/commit/442f602a45902beeb188575a85151f45b8be23ca), [`be912b2f`](https://github.com/Shopify/hydrogen/commit/be912b2ff7f4bc7a45688ff96d76f482b164efe5), [`b9ab8eb7`](https://github.com/Shopify/hydrogen/commit/b9ab8eb70f1506ab7516804ea69ecb9a693c420a), [`d3817b9c`](https://github.com/Shopify/hydrogen/commit/d3817b9c5e15db0c997089387fd9d43ab0fae027), [`93a7c3c6`](https://github.com/Shopify/hydrogen/commit/93a7c3c65fc10c8b1a16cee5fa57ad932d278dc8), [`6b8537ba`](https://github.com/Shopify/hydrogen/commit/6b8537ba1b4ce320a6b59a398ca12df731f97483)]:
  - @shopify/hydrogen-react@2023.4.4
  - @shopify/remix-oxygen@1.1.0
  - @shopify/hydrogen-codegen@0.0.2

## 4.2.1

### Patch Changes

- Fix release ([#926](https://github.com/Shopify/hydrogen/pull/926)) by [@blittle](https://github.com/blittle)

- Updated dependencies [[`7aaa4e86`](https://github.com/Shopify/hydrogen/commit/7aaa4e86739e22b2d9a517e2b2cfc20110c87acd)]:
  - @shopify/hydrogen-codegen@0.0.1
  - @shopify/hydrogen-react@2023.4.3
  - @shopify/remix-oxygen@1.0.7

## 4.2.0

### Minor Changes

- Add **UNSTABLE** support for GraphQL Codegen to automatically generate types for every Storefront API query in the project via `@shopify/hydrogen-codegen`. ([#707](https://github.com/Shopify/hydrogen/pull/707)) by [@frandiox](https://github.com/frandiox)

  > Note: This feature is unstable and subject to change in patch releases.

  How to use it while unstable:

  1. Write your queries/mutations in `.ts` or `.tsx` files and use the `#graphql` comment inside the strings. It's important that every query/mutation/fragment in your project has a **unique name**:

     ```ts
     const UNIQUE_NAME_SHOP_QUERY = `#graphql
       query unique_name_shop { shop { id } }
     `;
     ```

     If you use string interpolation in your query variables (e.g. for reusing fragments) you will need to specify `as const` after each interpolated template literal. This helps TypeScript infer the types properly instead of getting a generic `string` type:

     ```ts
     const UNIQUE_NAME_SHOP_FRAGMENT = `#graphql
       fragment unique_name_shop_fields on Shop { id name }
     `;

     const UNIQUE_NAME_SHOP_QUERY = `#graphql
       query unique_name_shop { shop { ...unique_name_shop_fields } }
       ${UNIQUE_NAME_SHOP_FRAGMENT}
     ` as const;
     ```

  2. Pass the queries to the Storefront client and do not specify a generic type value:

     ```diff
     -import type {Shop} from '@shopify/hydrogen/storefront-api-types';
     // ...
     -const result = await storefront.query<{shop: Shop}>(UNIQUE_NAME_SHOP_QUERY);
     +const result = await storefront.query(UNIQUE_NAME_SHOP_QUERY);
     ```

  3. Pass the flag `--codegen-unstable` when running the development server, or use the new `codegen-unstable` command to run it standalone without a dev-server:

     ```bash
     npx shopify hydrogen dev --codegen-unstable # Dev server + codegen watcher
     npx shopify hydrogen codegen-unstable # One-off codegen
     npx shopify hydrogen codegen-unstable --watch # Standalone codegen watcher
     ```

  As a result, a new `storefrontapi.generated.d.ts` file should be generated at your project root. You don't need to reference this file from anywhere for it to work, but you should commit it every time the types change.

  **Optional**: you can tune the codegen configuration by providing a `<root>/codegen.ts` file (or specify a different path with the `--codegen-config-path` flag) with the following content:

  ```ts
  import type {CodegenConfig} from '@graphql-codegen/cli';
  import {preset, pluckConfig, schema} from '@shopify/hydrogen-codegen';

  export default <CodegenConfig>{
    overwrite: true,
    pluckConfig,
    generates: {
      ['storefrontapi.generated.d.ts']: {
        preset,
        schema,
        documents: ['*.{ts,tsx}', 'app/**/*.{ts,tsx}'],
      },
    },
  };
  ```

  Feel free to add your custom schemas and generation config here or read from different document files. Please, report any issue you find in our repository.

### Patch Changes

- Add command to list environments from a linked Hydrogen storefront. ([#889](https://github.com/Shopify/hydrogen/pull/889)) by [@graygilmore](https://github.com/graygilmore)

- Update dev command to automatically injected environment variables from a linked Hydrogen storefront ([#861](https://github.com/Shopify/hydrogen/pull/861)) by [@graygilmore](https://github.com/graygilmore)

- Adds the ability to specify an Environment's branch name to interact with Hydrogen storefront environment variables ([#883](https://github.com/Shopify/hydrogen/pull/883)) by [@graygilmore](https://github.com/graygilmore)

- Fixes issue where routes that begin with the url `/events` could not be created because an internal handler had claimed those routes already. The internal handler now listens at `/__minioxygen_events` so hopefully that doesn't conflict with anyone now. :) ([#915](https://github.com/Shopify/hydrogen/pull/915)) by [@frehner](https://github.com/frehner)

- Updated dependencies [[`112ac42a`](https://github.com/Shopify/hydrogen/commit/112ac42a095afc5269ae75ff15828f27b90c9687), [`2e1e4590`](https://github.com/Shopify/hydrogen/commit/2e1e45905444ab04fe1fe308ecd2bd00a0e8fce1)]:
  - @shopify/hydrogen-codegen@0.0.0
  - @shopify/hydrogen-react@2023.4.2

## 4.1.2

### Patch Changes

- Add command to pull environment variables from a Hydrogen storefront defined in the Shopify Admin ([#809](https://github.com/Shopify/hydrogen/pull/809)) by [@graygilmore](https://github.com/graygilmore)

- Update docs links on successful project creation ([#810](https://github.com/Shopify/hydrogen/pull/810)) by [@gfscott](https://github.com/gfscott)

- New `--debug` flag for the `dev` command that attaches a Node inspector to the development server. ([#869](https://github.com/Shopify/hydrogen/pull/869)) by [@frandiox](https://github.com/frandiox)

- Ensure request logs are shown in MiniOxygen during development. ([#836](https://github.com/Shopify/hydrogen/pull/836)) by [@frandiox](https://github.com/frandiox)

  Provide [custom Oxygen headers](https://shopify.dev/docs/custom-storefronts/oxygen/worker-runtime-apis#custom-headers) in local MiniOxygen.

- Add new commands for merchants to be able to list and link Hydrogen storefronts on Shopify ([#784](https://github.com/Shopify/hydrogen/pull/784)) by [@graygilmore](https://github.com/graygilmore)

- Updated dependencies [[`025385b6`](https://github.com/Shopify/hydrogen/commit/025385b6f9f58a76ffb15d9f505dfbf2b5e21427), [`0a009a3b`](https://github.com/Shopify/hydrogen/commit/0a009a3ba06dadd8f9d799575d7f88590f82a966)]:
  - @shopify/remix-oxygen@1.0.6
  - @shopify/hydrogen-react@2023.4.1

## 4.1.1

### Patch Changes

- Fix the `check routes` command to match optional segments. ([#774](https://github.com/Shopify/hydrogen/pull/774)) by [@frandiox](https://github.com/frandiox)

- Updated dependencies [[`82b6af7`](https://github.com/Shopify/hydrogen/commit/82b6af71cafe1f88c24630178e61cd09e5a59f5e), [`361879e`](https://github.com/Shopify/hydrogen/commit/361879ee11dfe8f1ee916b022165b1e7f0e45964)]:
  - @shopify/hydrogen-react@2023.4.0

## 4.1.0

### Minor Changes

- Updated CLI prompts. It's recommended to update your version of `@shopify/cli` to `3.45.0` when updating `@shopify/cli-hydrogen`. ([#733](https://github.com/Shopify/hydrogen/pull/733)) by [@frandiox](https://github.com/frandiox)

  ```diff
  "dependencies": {
  -  "@shopify/cli": "3.x.x",
  +  "@shopify/cli": "3.45.0",
  }
  ```

- Added a new `shortcut` command that creates a global `h2` alias for the Hydrogen CLI: ([#679](https://github.com/Shopify/hydrogen/pull/679)) by [@frandiox](https://github.com/frandiox)

  ```sh
  $> npx shopify hydrogen shortcut
  ```

  After that, you can run commands using the new alias:

  ```sh
  $> h2 generate route home
  $> h2 g r home # Same as the above
  $> h2 check routes
  ```

### Patch Changes

- Add support for the Remix future flags `v2_meta`, `v2_errorBoundary` and `v2_routeConvention` to the `generate` command. If these flags are enabled in your project, the new generated files will follow the v2 conventions. ([#756](https://github.com/Shopify/hydrogen/pull/756)) by [@frandiox](https://github.com/frandiox)

- Update virtual route to use Remix V2 route name conventions ([#792](https://github.com/Shopify/hydrogen/pull/792)) by [@DavidWittness](https://github.com/DavidWittness)

- Bump internal Remix dependencies to 1.15.0. ([#728](https://github.com/Shopify/hydrogen/pull/728)) by [@wizardlyhel](https://github.com/wizardlyhel)

  Recommendations to follow:

  - Upgrade all the Remix packages in your app to 1.15.0.
  - Enable Remix v2 future flags at your earliest convenience following [the official guide](https://remix.run/docs/en/1.15.0/pages/v2).

- Improve type safety in SEO data generators. ([#763](https://github.com/Shopify/hydrogen/pull/763)) by [@davidhousedev](https://github.com/davidhousedev)

- Updated dependencies [[`85ae63a`](https://github.com/Shopify/hydrogen/commit/85ae63ac37e5c4200919d8ae6c861c60effb4ded), [`5e26503`](https://github.com/Shopify/hydrogen/commit/5e2650374441fb5ae4840215fefdd5d547a378c0), [`1f8526c`](https://github.com/Shopify/hydrogen/commit/1f8526c750dc1d5aa7ea02e196fffdd14d17a536)]:
  - @shopify/hydrogen-react@2023.1.8
  - @shopify/remix-oxygen@1.0.5

## 4.0.9

### Patch Changes

- 1. Update Remix to 1.14.0 ([#599](https://github.com/Shopify/hydrogen/pull/599)) by [@blittle](https://github.com/blittle)

  1. Add `Cache-Control` defaults to all the demo store routes

- Fixed a typo in the install deps flag. The flag is now SHOPIFY_HYDROGEN_FLAG_INSTALL_DEPS. ([#672](https://github.com/Shopify/hydrogen/pull/672)) by [@cartogram](https://github.com/cartogram)

- Display warning for deprecated flags. ([#609](https://github.com/Shopify/hydrogen/pull/609)) by [@cartogram](https://github.com/cartogram)

- Fix bug in CLI not recognising the --install-deps flag when creating projects ([#644](https://github.com/Shopify/hydrogen/pull/644)) by [@cartogram](https://github.com/cartogram)

- Fix `check routes` command to correctly check the standard route `/discount/<code>` instead of `/discounts/<code>`. ([#601](https://github.com/Shopify/hydrogen/pull/601)) by [@frandiox](https://github.com/frandiox)

- Stop hydrating with `requestIdleCallback` ([#667](https://github.com/Shopify/hydrogen/pull/667)) by [@juanpprieto](https://github.com/juanpprieto)

- Updated dependencies [[`c78f441`](https://github.com/Shopify/hydrogen/commit/c78f4410cccaf99d93b2a4e4fbd877fcaa2c1bce), [`7fca5d5`](https://github.com/Shopify/hydrogen/commit/7fca5d569be1d6749fdfa5ada6723d8186f0d775)]:
  - @shopify/hydrogen-react@2023.1.7
  - @shopify/remix-oxygen@1.0.4

## 4.0.8

### Patch Changes

- Improve rate limit error messages when creating new projects. ([#553](https://github.com/Shopify/hydrogen/pull/553)) by [@frandiox](https://github.com/frandiox)

- Show better errors when initial build fails, and recover when fixing it. ([#514](https://github.com/Shopify/hydrogen/pull/514)) by [@frandiox](https://github.com/frandiox)

## 4.0.7

### Patch Changes

- Use woff2 format instead of ttf in onboarding routes to reduce download size of font files. ([#538](https://github.com/Shopify/hydrogen/pull/538)) by [@lordofthecactus](https://github.com/lordofthecactus)

- Show available upgrades for CLI when creating new projects. ([#518](https://github.com/Shopify/hydrogen/pull/518)) by [@frandiox](https://github.com/frandiox)

## 4.0.6

### Patch Changes

- Fix CLI flags for init command, and add `--install-deps`. ([#516](https://github.com/Shopify/hydrogen/pull/516)) by [@frandiox](https://github.com/frandiox)

- Fix template download on Windows during project creation. ([#528](https://github.com/Shopify/hydrogen/pull/528)) by [@tchalabi](https://github.com/tchalabi)

- Fix template imports to only reference `@shopify/hydrogen`, not `@shopify/hydrogen-react` ([#523](https://github.com/Shopify/hydrogen/pull/523)) by [@blittle](https://github.com/blittle)

- Fix pathnames on Windows when running the development server. ([#520](https://github.com/Shopify/hydrogen/pull/520)) by [@frandiox](https://github.com/frandiox)

- Onboarding fonts and styles ([#533](https://github.com/Shopify/hydrogen/pull/533)) by [@lordofthecactus](https://github.com/lordofthecactus)

- Corrects links referred to in Onboarding Route. ([#509](https://github.com/Shopify/hydrogen/pull/509)) by [@benjaminsehl](https://github.com/benjaminsehl)

- Improve onboarding style and links ([#525](https://github.com/Shopify/hydrogen/pull/525)) by [@lordofthecactus](https://github.com/lordofthecactus)

- Updated dependencies [[`ff9d729`](https://github.com/Shopify/hydrogen/commit/ff9d7297bf6cb814ac4593cb20402872ef7c30eb)]:
  - @shopify/remix-oxygen@1.0.3

## 4.0.5

### Patch Changes

- Fix missing assets in virtual routes. ([#503](https://github.com/Shopify/hydrogen/pull/503)) by [@frandiox](https://github.com/frandiox)

## 4.0.4

### Patch Changes

- Fix pathnames in Windows when creating projects and generating routes. ([#495](https://github.com/Shopify/hydrogen/pull/495)) by [@frandiox](https://github.com/frandiox)

## 4.0.3

### Patch Changes

- Fix initialization a new Hydrogen project on Windows ([#478](https://github.com/Shopify/hydrogen/pull/478)) by [@pepicrft](https://github.com/pepicrft)

## 4.0.2

### Patch Changes

- Add license files and readmes for all packages ([#463](https://github.com/Shopify/hydrogen/pull/463)) by [@blittle](https://github.com/blittle)

- Updated dependencies [[`517f0f7`](https://github.com/Shopify/hydrogen/commit/517f0f72531effbe9028e293c77aac1a20828573)]:
  - @shopify/remix-oxygen@1.0.2

## 4.0.1

### Patch Changes

- Initial release
