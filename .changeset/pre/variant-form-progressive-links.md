---
"@shopify/hydrogen": patch
---

Update the `hydrogen-variant-form` skill so that progressive option links make one client navigation after hydration. Option links keep a real `href` for no-JS shoppers. A guarded click handler calls the registered handler, and the provider `onSelect` is the only navigation. Modifier-key and new-tab clicks stay native. The link `href` and `onSelect` use the same current-query base. The skill now shows the React Router, Next.js (`onNavigate`), and Nuxt (`NuxtLink` `custom`) patterns, and the same guarded-anchor pattern for SolidStart and SvelteKit apps that use the core store directly. The `hydrogen-setup` product detail page step now follows the same guidance.
