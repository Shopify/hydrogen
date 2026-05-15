---
"skeleton": patch
"@shopify/cli-hydrogen": patch
"@shopify/create-hydrogen": patch
---

Improve accessibility across skeleton template and recipe components:

- **PaginatedResourceSection**: render region wrapper when `ariaLabel` is provided even without `resourcesClassName`, and add `aria-live` announcements for loading state and item count changes
- **Heading hierarchy** (metaobjects recipe): fix skipped heading levels in SectionHero, SectionStoreProfile, SectionStores, and use semantic `<section>` instead of `<div role="region">` in Sections
- **CountrySelector** (markets recipe): add Escape key handling to close the disclosure widget and return focus to the trigger, remove incorrect `role="group"` override on `<details>`
- **Infinite scroll** (recipe): separate Intersection Observer sentinel from focusable NextLink to prevent keyboard navigation from triggering auto-loading (WCAG 2.1.1), and add deferred `aria-live` announcements for product count changes
