---
"@shopify/hydrogen-codegen": patch
---

Fix codegen to use the correct version of the underlying GraphQL code generation library. Previously, custom codegen configurations (non-default output paths or formats) could fail with unexpected validation errors.
