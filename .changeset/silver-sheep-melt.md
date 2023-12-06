---
'@shopify/cli-hydrogen': minor
---

Add the `--debug` flag to the [`dev` command](https://h2o.fyi/cli#dev) to enable step debugging in browser dev tools.

To enable debugger connections for the Hydrogen app worker file, run `npx shopify hydrogen dev --debug --worker`, then open [localhost:9229](http://localhost:9229) in your browser.
