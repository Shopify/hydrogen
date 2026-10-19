---
'@shopify/cli-hydrogen': patch
---

Add shared output plumbing for upcoming JSON command results. Route dependency console logs to stderr in JSON mode while preserving persistent dev-server log filters. Restore CPU startup profiling with support for Node builtins, isolated Worker-like globals on each run, and reliable inspector cleanup.
