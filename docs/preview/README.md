# Docs Previewer

This tool makes it easier to preview reference docs that are deployed to shopify.dev.

## Usage

Run the dev command from a path that contains a `docs/generated/generated_docs_data.json` file.

Example from the `packages/hydrogen` or `packages/hydrogen-react` directories:

```bash
npm run dev --prefix ../../docs/preview
```

Alternatively, pass `GEN_DOCS_PATH` as an environment variable to overwrite the default path.
