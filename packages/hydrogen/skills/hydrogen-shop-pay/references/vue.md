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
  channel="hydrogen"
  :disabled="!addable || form.pending.value"
  width="100%"
  border-radius="9999px"
/>
```

In Nuxt, this component should render in a client-capable component. The Vue binding sets the checkout URL and loads Shop JS in `onMounted`.

Hydrogen reserves space around the custom element while it hydrates. Use wrapper `style` only when it needs a different reservation; do not pass `height`.

Use `:load-script="false"` only when another component/script already loads Shop JS.
