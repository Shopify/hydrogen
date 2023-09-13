---
'@shopify/cli-hydrogen': patch
---

We've added a tool for analyzing bundle sizes. You should try to keep your worker bundle small. The larger it gets effects the cold startup time of your app. We now include `client-bundle-analyzer.html` and `worker-bundle-analyzer.html` files in the build output. Open these in your browser to view an interactive analysis of your bundles. The CLI output also includes links to each file. Hydrogen also fails to build if your bundle size is over 10 MB. This is because Oxygen only supports worker bundles less than 10 MB.
