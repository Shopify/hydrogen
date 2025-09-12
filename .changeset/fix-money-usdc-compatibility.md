---
'@shopify/hydrogen-react': patch
---

Fix Money component compatibility with Customer Account API USDC currency

The 2025-07 API update added USDC currency to Customer Account API but not Storefront API, causing TypeScript errors and runtime failures. This fix:

- Updates Money component to accept MoneyV2 from both Storefront and Customer Account APIs
- Handles unsupported currency codes (like USDC) that Intl.NumberFormat doesn't recognize
- Falls back to decimal formatting with currency code suffix (e.g., "100.00 USDC")
- Maintains 2 decimal places for USDC to reinforce its 1:1 USD peg