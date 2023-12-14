---
'skeleton': patch
---

Updated the GraphQL config in `.graphqlrc.yml` to use the more modern `projects` structure:

```diff
-schema: node_modules/@shopify/hydrogen/storefront.schema.json
+projects:
+ default:
+    schema: 'node_modules/@shopify/hydrogen/storefront.schema.json'
```

This allows you to add additional projects to the GraphQL config, such as third party CMS schemas.

Also, you can modify the document paths used for the Storefront API queries:

```yaml
projects:
  default:
    schema: 'node_modules/@shopify/hydrogen/storefront.schema.json'
    documents:
     - '*!(*.d).{ts,tsx,js,jsx}'
     - 'app/**/*!(*.d).{ts,tsx,js,jsx}'
```
