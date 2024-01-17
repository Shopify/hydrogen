---
'@shopify/cli-hydrogen': major
---

Remove --publicDeployment flag from deploy command

The ability to mark individual deployments as public has been deprecated. If you need to deployments to be accessible by other services for the purposes of end-to-end testing you can make use of the newly added `--auth-bypass-token` flag.
