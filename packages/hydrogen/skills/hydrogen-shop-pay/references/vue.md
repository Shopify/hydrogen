# Vue And Nuxt

Import from the Vue entrypoint:

```vue
<script setup lang="ts">
import { canAddToCart } from "@shopify/hydrogen";
import { ShopPayButton } from "@shopify/hydrogen/vue";

const form = useProductForm();
const quantity = ref(1);
const addable = computed(() => canAddToCart(props.product, form.options));
</script>
```

Render only when a variant is resolved:

```vue
<ShopPayButton
  v-if="form.selectedVariant"
  :variants="[{ id: form.selectedVariant.id, quantity }]"
  :disabled="!addable || form.pending.value"
  width="100%"
  border-radius="9999px"
  accessibility-label="Shop Pay से खरीदें"
/>
```

The component renders a self-contained `<hydrogen-shop-pay-button>` element, so it works
with Nuxt server rendering and needs no client-only wrapper.

Size with `width`/`border-radius` props; extra attributes (including `class` and
`style`) fall through to the inner anchor. Pass `accessibility-label` when the
storefront language is not English. Localize words around the brand, but never
translate `Shop Pay` itself.
