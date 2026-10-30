# UCP fixtures

Copied from Shopify/shopd-mcp, `origin/multimerchant-checkouts` at
`b1175ad93bb8cfaf25d3812ec55e52f2aab8993b`, UCP version 2026-08-25.

Sources: `fixtures/cta/get_cart/{aggregate-read,aggregate-mixed-currency-read}.json`
and `fixtures/cta/create_cart/{aggregate-single-session,aggregate-child-failure,aggregate-empty}.json`.
Fixtures include the test runner envelope; the UCP document is `response`.
There is no KWD cart fixture at this revision; KWD conversion is tested directly.
