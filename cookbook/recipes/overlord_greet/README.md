# 🧑‍🍳 overlord_greet

*TODO*

## 🍣 Ingredients

| File | Description |
| --- | --- |

## 🍱 Steps

### 1. app/components/Header.tsx



#### File: [`app/components/Header.tsx`](/templates/skeleton/app/components/Header.tsx)

```diff
index 8a437a10..f11782ca 100644
--- a/templates/skeleton/app/components/Header.tsx
+++ b/templates/skeleton/app/components/Header.tsx
@@ -29,6 +29,7 @@ export function Header({
       <NavLink prefetch="intent" to="/" style={activeLinkStyle} end>
         <strong>{shop.name}</strong>
       </NavLink>
+      Hello World! I for one greet our new overlords.
       <HeaderMenu
         menu={menu}
         viewport="desktop"

```