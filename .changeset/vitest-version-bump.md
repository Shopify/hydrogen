---
'@shopify/cli-hydrogen': patch
'@shopify/create-hydrogen': patch
'@shopify/hydrogen': patch
'@shopify/hydrogen-react': patch
'@shopify/hydrogen-codegen': patch
'@shopify/mini-oxygen': patch
---

Update vitest to v3.2.4 and improve test configurations

This updates all packages using vitest from v1.0.4 to v3.2.4 for better performance, improved test coverage features, and bug fixes.

**Version updates:**
- vitest: ^1.0.4 → ^3.2.4
- @vitest/coverage-v8: ^1.0.4 → ^3.2.4

**Configuration improvements:**
- Added `restoreMocks: true` to cli and hydrogen-react configs to automatically clean up mocks between tests
- Removed manual `vi.clearAllMocks()` and `vi.resetAllMocks()` calls from 28 CLI test files, eliminating boilerplate code

All existing tests continue to pass with the new version.