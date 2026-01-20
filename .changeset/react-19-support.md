---
'@shopify/hydrogen': minor
'@shopify/hydrogen-react': minor
---

Add React 19 support while maintaining React 18 compatibility

- Updated Hydrogen peerDependencies to accept React ^18.3.1 or non-CVE-containing React 19 versions

Users can now upgrade their Hydrogen projects to React 19 without npm peer dependency conflicts. Existing React 18 projects continue to work without changes.
