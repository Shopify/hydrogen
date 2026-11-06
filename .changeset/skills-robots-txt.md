---
"@shopify/hydrogen": patch
---

Adds the `hydrogen-robots-txt` skill, which tells agents how to serve `/robots.txt` from a headless storefront. It gives a default rule set with the reason for each rule, explains how to adjust the rules for markets and custom routes, and lists the route to add in each framework. The `hydrogen-setup` scaffold step now has agents serve `/robots.txt`, and `hydrogen-smoke-test` checks it. `hydrogen-request-handlers` points to the skill, and the `migrate-to-hydrogen-2026-10` skill keeps a storefront's existing rules and adds the request handler paths.
