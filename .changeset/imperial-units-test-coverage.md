---
"@shopify/hydrogen-react": patch
---

Add comprehensive test coverage for unit price measurements in Money component

Adds extensive test coverage for unit price measurements in the Money component, ensuring both metric and imperial units display correctly with complete price formatting.

**Updates to test helpers:**
- Extended `Money.test.helpers.ts` to include imperial units (LB, OZ, FLOZ, PT, QT, GAL, IN, FT, YD, FT2) alongside existing metric units
- Added ITEM unit support for count-based pricing

**New comprehensive test suite:**
Added "unit price measurement formatting" test suite that verifies:
- Complete price formatting with units (e.g., "$10.99/LB", "€25.50/KG", "$5.00/GAL")
- All measurement categories: weight (KG/LB/OZ), volume (L/GAL/FLOZ), length (M/FT/IN), area (M2/FT2), and count (ITEM)
- Decimal place handling with `withoutTrailingZeros` prop
- Currency display options with `withoutCurrency` prop
- Custom separators (e.g., "$10.00 per LB", "€5.50 - LB", "$8.00LB")
- Edge cases: very small amounts ($0.01/OZ) and large amounts with thousand separators ($999,999.99/LB)
- Multiple currencies: USD, EUR, CAD with appropriate units

The Money component already supported all these units from the Storefront API, but tests only covered metric units. This ensures complete test coverage for the existing unit price measurement functionality.