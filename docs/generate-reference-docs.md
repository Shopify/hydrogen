# Generate API reference docs for Hydrogen and Hydrogen React

The reference docs for Hydrogen and Hydrogen React are published on [Shopify.dev](https://shopify.dev):

- [Hydrogen](https://shopify.dev/docs/api/hydrogen)
- [Hydrogen React](https://shopify.dev/docs/api/hydrogen-react)

In both cases, the reference documentation is stored in the Hydrogen repo in `*.doc.ts` files ([example](https://github.com/Shopify/hydrogen/blob/-/packages/hydrogen-react/src/Image.doc.ts)). These files get compiled into JSON, which is then copied over to Shopify.dev.

## Generate the docs

1. From the command line, `cd` to either `packages/hydrogen` or `packages/hydrogen-react`.
1. Run `npm run build-docs` (view [build script](https://github.com/Shopify/hydrogen/blob/-/packages/hydrogen-react/docs/build-docs.sh))
1. The script compiles and formats either one or both JSON files:

- `packages/{PACKAGE}/docs/generated/generated_docs_data.json`
- `packages/{PACKAGE}/docs/generated/generated_static_pages.json`

1. You're now ready to copy these files to Shopify.dev.

## Copy to Shopify.dev

> Note:
> Only Shopify staff will be able to complete these tasks, as it requires access to the private code repository for [Shopify.dev](https://shopify.dev).

1. Open the Shopify.dev repo and check out a new branch.
1. Copy the contents of the compiled JSON files to their corresponding location in the Shopify.dev repo.

- `db/data/docs/templated_apis/{PACKAGE}/{VERSION}/generated_docs_data.json`
- `db/data/docs/templated_apis/{PACKAGE}/{VERSION}/generated_static_pages.json`

1. Commit the changes and create a PR.
