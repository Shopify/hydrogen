# Framework-Agnostic Setup

Without the React or Vue bindings, render the script tags from core and the widget element yourself.

## Server

Pass `accountWidget` to the same script helper the page already uses for Shopify's scripts:

```ts
import { renderShopifyScriptTags } from "@shopify/hydrogen";

const head = renderShopifyScriptTags({ shop, accountWidget }).join("");
```

This renders, in order, the JSON script tag and `account.js`:

```html
<script id="shopify-customer-account-data" type="application/json">{"customer":null,...}</script>
<script id="shopify-account" type="module" async crossorigin="anonymous" src="https://cdn.shopify.com/storefront/web-components/account.js"></script>
```

Use `getShopifyScriptTags()` instead when the framework's head API takes tag objects. Both helpers escape the JSON and copy only the known fields; always render the tag through them.

Render the element where the widget should appear:

```html
<shopify-account sign-in-url="/account/login"></shopify-account>
```

## Browser: Remount on Change

`<shopify-account>` reads the JSON once, in `connectedCallback`. Updating the JSON alone changes nothing on screen. After the data changes:

1. Replace the JSON script tag's text with the new serialized data.
2. Then replace every `<shopify-account>` with a fresh element, so each one connects again and reads the new JSON.

```ts
function updateAccountWidget(serializedData: string) {
  const data = document.getElementById("shopify-customer-account-data");
  if (data) data.textContent = serializedData;

  for (const widget of document.querySelectorAll("shopify-account")) {
    widget.replaceWith(widget.cloneNode(true));
  }
}
```

Get `serializedData` on the server from the JSON descriptor's `innerHTML`, which is already escaped:

```ts
const serializedData = getShopifyScriptTags({ shop, accountWidget }).scripts.find(
  ({ attributes }) => attributes?.id === "shopify-customer-account-data",
)?.innerHTML;
```

Do the steps in that order. A widget that connects before the JSON updates reads the old data.

`cloneNode(true)` keeps the element's attributes and slot children, including any attributes the component set on itself at runtime. If the framework owns the DOM (for example a virtual DOM or keyed template), remount through the framework instead, such as by changing the element's key, so the framework's node references stay valid.
