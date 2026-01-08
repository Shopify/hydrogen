---
'@shopify/hydrogen': minor
'@shopify/hydrogen-react': minor
---

Add React 19 support while maintaining React 18 compatibility

- Updated `@shopify/hydrogen` peerDependencies to accept `react: ^18.0.0 || ^19.0.0`
- Updated `@shopify/hydrogen-react` peerDependencies to accept `react: ^18.0.0 || ^19.0.0` and `react-dom: ^18.0.0 || ^19.0.0`
- Updated `use-isomorphic-layout-effect` from 1.1.2 to 1.2.1 (adds React 19 peer dep support)
- Updated `use-sync-external-store` from 1.2.0 to 1.6.0 (adds React 19 peer dep support)

Users can now upgrade their Hydrogen projects to React 19 without npm peer dependency conflicts. Existing React 18 projects continue to work without changes.
