# cookbook

## 1.0.1

### Patch Changes

- Fix multipass recipe missing Step 19: add login route patch that replaces Customer Account API login redirect with form-based Storefront API login. Without this patch, the applied recipe kept the CAAPI login flow, breaking the multipass authentication. ([#3604](https://github.com/Shopify/hydrogen/pull/3604)) by [@itsjustriley](https://github.com/itsjustriley)
