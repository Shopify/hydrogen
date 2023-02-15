# Working on Hydrogen (WIP)

## Summary

The Hydrogen monorepo contains multiple packages (found in `/packages/`) and templates (found in `/templates/`). This document is intended to outline some common workflows for working on these packages and templates locally. 

### Common commands

- You can run `npm run build` and `npm run dev` at the root of the repo to build everything at once.
- Both of the above commands will work inside individual packages if you want to only build a single package (this can be helpful if the console output contains too much information when building everything at once).

Running `npm run dev` at the root of the repo is the most common way to develop in Hydrogen. The below commands outline more package-specific tips.

### CLI

- Run `npm run build` in the `packages/cli` repo.
- Run `npx shopify hydrogen` anywhere else in the monorepo, for example `npx shopify hydrogen init`.
- If you want to test a command inside of a template, run the command from within that template or use the `--path` flag to point to another template or any Hydrogen app.
- If you want to make changes to a file that is generated when running `npx shopify hydrogen generate`, make changes to that file from inside of the `templates/skeleton` directory. 
