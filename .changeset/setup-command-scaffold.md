---
"@shopify/hydrogen": minor
---

`hydrogen setup` now works without a `package.json`. When run in a directory with no project, it prompts to either scaffold the React Router template from the `dist-preview` branch or install AI coding skills only. Existing behavior (install Hydrogen + sync skills) is preserved when a `package.json` is present.
