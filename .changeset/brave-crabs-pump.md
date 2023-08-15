---
'@shopify/hydrogen-react': patch
---

This change updates the implementation of the parseGid function so that it uses the builtin `URL` class to parse the gid. This enables the parts of the string, such as the search params, to be parsed as well
