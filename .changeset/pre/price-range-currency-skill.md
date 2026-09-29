---
"@shopify/hydrogen": patch
---

Update the collection browser skill with currency-aware price inputs that use narrow currency symbols and accessible currency labels, and submit price inputs on change with a 350 ms debounce instead of on blur. Filter controls stay mounted and enabled while results load, checked and selected values bind to browse state instead of remounting on filter state, and native keyboard behavior is kept.
