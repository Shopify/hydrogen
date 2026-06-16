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
  height="48px"
  border-radius="9999px"
/>
```

In Nuxt, this component should render in a client-capable component. The Vue binding sets the checkout URL and loads Shop JS in `onMounted`.

Use `:load-script="false"` only when another component/script already loads Shop JS.
