---
'@shopify/cli-hydrogen': minor
---

Add the [`upgrade` command](https://h2o.fyi/cli#upgrade) to make it easier to upgrade from older versions of Hydrogen. Features:

- Automatically updates dependencies in your package.json file.
- Generates a customized instruction file in the `/.shopify` directory, outlining any code changes required to complete the upgrade.
- Adds a warning when running the `dev` command with an outdated version.
- Defaults to the latest version. Pass a `--version` flag and a version number to select a specific one.

To get started, run `npx shopify hydrogen upgrade` in your Hydrogen project.
