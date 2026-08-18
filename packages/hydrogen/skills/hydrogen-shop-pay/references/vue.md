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

The component server-renders a `<hydrogen-shop-pay-button>` with a declarative
shadow root, so it works with Nuxt server rendering and needs no client-only
wrapper. The shadow root protects the branded internal styles.

Size with `width`/`border-radius`. Extra `class` and `style` attributes are
intentionally not forwarded into the shadow root. Pass `accessibility-label`
when the storefront language is not English. Localize words around the brand,
but never translate `Shop Pay` itself. Pass `nonce` when the storefront's
Content Security Policy requires nonces for inline `<style>` elements. The nonce
does not authorize the `style` attribute used by `width` and `border-radius`;
strict policies must allow inline style attributes for those custom dimensions.
