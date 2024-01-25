---
'skeleton': patch
---

Update the GraphQL config in `.graphqlrc.yml` to use the more modern `projects` structure:

```diff
-schema: node_modules/@shopify/hydrogen/storefront.schema.json
+projects:
+ default:
+    schema: 'node_modules/@shopify/hydrogen/storefront.schema.json'
```

This allows you to add additional projects to the GraphQL config, such as third party CMS schemas.

Also, you can modify the document paths used for the Storefront API queries. This is useful if you have a large codebase and want to exclude certain files from being used for codegen or other GraphQL utilities:

```yaml
projects:
  default:
    schema: 'node_modules/@shopify/hydrogen/storefront.schema.json'
    documents:
     - '!*.d.ts'
     - '*.{ts,tsx,js,jsx}'
     - 'app/**/*.{ts,tsx,js,jsx}'
```
