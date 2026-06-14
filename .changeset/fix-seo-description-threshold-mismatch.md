---
'@shopify/hydrogen': patch
---

Aligned the SEO `description` length validation with its error message. Descriptions are now only rejected when longer than 160 characters (previously 155), matching the "should not be longer than 160 characters" error and standard SEO guidance. Descriptions between 156–160 characters that were previously rejected will now be accepted.
