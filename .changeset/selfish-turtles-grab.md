---
'@shopify/hydrogen-react': patch
---

Add a deprecation notice to `<CartLinePrice/>`:

Use `Money` instead. To migrate, use the `priceType` prop that matches the corresponding property on the `CartLine` object:

- `regular`: `cartLine.cost.totalAmount`
- `compareAt`: `cartLine.cost.compareAtAmountPerQuantity`

For example:

```jsx
// before
<CartLinePrice data={cartLine} priceType="regular" />
// after
<Money data={cartLine.cost.totalAmount} />
```
