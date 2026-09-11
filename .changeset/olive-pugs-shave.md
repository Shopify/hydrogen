---
'@shopify/cli-hydrogen': patch
'@shopify/create-hydrogen': patch
---

Fix Hydrogen monorepo detection when the repository path contains spaces or other characters that are percent-encoded in URLs. The path is now decoded before it is used to look for the skeleton template.
