# Changesets setup

We are mocking releases for h2 so that we can make sure our workflow works properly
before we make h2 public.

Below is the temporary npm packages names that we are releasing to:

| Package folder | Test NPM release name             | Future NPM release name | Notes                      |
| -------------- | --------------------------------- | ----------------------- | -------------------------- |
| `cli`          | `@shopify/cli-h2-test`            | `@shopify/cli-hydrogen` | Needs to start with `cli-` |
| `hydrogen`     | `@shopify/h2-test-hydrogen`       | `@shopify/hydrogen`     |                            |
| `remix-oxygen` | `@shopify/h2-test-remix-oxygen` . | `@shopify/remix-oxygen` |                            |

Before switching to officially releases, make sure all package names and versions are set properly,
including the `package.json` for the `demo-store`. (Do a search for the test npm names)

Look for anywhere that is using the cli build command `shopify h2-test` and replace it back with `shopify hydrogen`
