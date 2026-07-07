# React Setup

## Shopify Routes

When a framework binding exports `ShopifyScripts`, it loads WebMCP by default. When Shopify or Hydrogen browser utilities need to navigate through the framework router, pass a top-level navigation hook to `ShopifyScripts`.

```tsx
import { ShopifyScripts } from "@shopify/hydrogen/react";

export function App() {
  const navigate = useNavigate();

  return (
    <html>
      <head>
        <ShopifyScripts navigate={navigate} />
      </head>
      <body>{/* app layout */}</body>
    </html>
  );
}
```
