# Cart Drawer CSS

Reference drawer shell, entry/exit animation, backdrop, and scroll-lock CSS for the cart drawer.

```css
dialog#cart-drawer {
  position: fixed;
  inset-block: 0;
  right: 0;
  left: auto;
  margin: 0;
  width: 100%;
  max-width: 28rem;
  height: 100dvh;
  max-height: none;
  border: 0;
  padding: 0;
}
```

**Entry and exit animation**: slide in from the edge and let the dialog remain transitionable while closing.
```css
dialog#cart-drawer {
  transform: translateX(100%);
  transition:
    transform 250ms cubic-bezier(0.22, 1, 0.36, 1),
    overlay 250ms allow-discrete,
    display 250ms allow-discrete;
}

dialog#cart-drawer[open] {
  transform: translateX(0);
}

@starting-style {
  dialog#cart-drawer[open] {
    transform: translateX(100%);
  }
}
```

**Backdrop**: fade in.
```css
dialog#cart-drawer::backdrop {
  background: rgb(0 0 0 / 0);
  transition:
    background-color 250ms ease-out,
    overlay 250ms allow-discrete,
    display 250ms allow-discrete;
}
dialog#cart-drawer[open]::backdrop {
  background: rgb(0 0 0 / 0.3);
}

@starting-style {
  dialog#cart-drawer[open]::backdrop {
    background: rgb(0 0 0 / 0);
  }
}
```

**Scroll lock**:
```css
body:has(dialog#cart-drawer[open]) { overflow: hidden; }
```

Exact measurements and colors are not prescribed — the above matches the base example for reference. Adapt to the project's design system.
