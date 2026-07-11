---
"@shopify/hydrogen": patch
---

Include the selected variant's `selectedOptions` in the add-to-cart event detail built by the product form. Optimistic cart lines now carry `merchandise.selectedOptions` during the mutation window, so cart line components that render option names (e.g. `Size: Large`) no longer flicker from the variant title to the resolved options when the add-to-cart mutation completes.
