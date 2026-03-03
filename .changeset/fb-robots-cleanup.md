---
'@shopify/hydrogen': patch
'@shopify/cli-hydrogen': patch
---

Updated the skeleton `robots.txt` defaults to remove disallow rules that are specific to Shopify themes and not part of a new Hydrogen app by default. This reduces confusion when reviewing or customizing robots rules in scaffolded projects.
