---
'@shopify/cli-hydrogen': minor
---

The `deploy` command now displays an error if there are uncommited changes in a project's Git repository. If you'd like to go ahead with the deployment regardless, you can use the new `force` flag.
When deploying with uncommited changes, we use a default description in the form of `<sha> with additional changes` (where `<sha>` represents the hash of the last commit). This description will be visible in the Shopify Admin for the deployment, and the `metadata-description` flag can be used to specify a different description.

In CI environments, the `deploy` command now creates a file "h2_deploy_output_log.json" file in the current working directory, for successful deployments. This file holds a JSON object with the URL of the deployment. This can be useful for scripting purposes, where consequent steps in your CI workflow require the deployment URL. The flag `--no-json-output` can be used to prevent this behaviour. In the future, we may add further keys to the JSON object.
