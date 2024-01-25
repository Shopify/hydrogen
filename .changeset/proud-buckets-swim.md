---
'@shopify/cli-hydrogen': patch
---

Add --preview flag to deploy command

You can now explicitly deploy to the Preview environment with the `--preview` flag regardless of your current Git branch. For example, you can use this flag to test your changes before deploying to production if you're working off of your `main` branch.
