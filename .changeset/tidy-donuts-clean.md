---
"@shopify/hydrogen": patch
---

Remove dead code and tighten internal module boundaries. Delete unused files and helpers, stop exporting internal symbols that nothing consumes, prune unused barrel re-exports, and consolidate duplicated path-prefix normalization (which also fixes whitespace-padded locale prefixes producing malformed paths). No public API changes.
