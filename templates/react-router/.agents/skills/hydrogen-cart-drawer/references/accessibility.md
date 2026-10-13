# Dialog/Drawer Accessibility Requirements

Framework-agnostic specification for building an accessible modal drawer. Grounded in the WHATWG HTML specification for the `<dialog>` element and WAI-ARIA Authoring Practices.

## The `<dialog>` element with `showModal()`

The native `<dialog>` element with `showModal()` is the recommended foundation. It provides six accessibility behaviors for free, leaving only three concerns for the implementation to handle.

### What `showModal()` provides

| Behavior | How it works |
|----------|-------------|
| **Top-layer rendering** | The dialog is promoted above all other content, regardless of `z-index` stacking. No z-index wars. |
| **`::backdrop` pseudo-element** | A full-viewport overlay rendered behind the dialog in the top layer. Styleable with CSS. |
| **Escape key dismissal** | Pressing Escape fires a `cancel` event (cancelable), then closes the dialog and fires a `close` event. |
| **Focus containment** | All content outside the dialog becomes `inert` — unreachable by Tab, click, or assistive technology. Tab and Shift+Tab cycle only through focusable elements inside the dialog. |
| **Focus restoration** | The browser stores the previously-focused element when `showModal()` is called and restores focus to it when the dialog closes via `close()`. Per the WHATWG spec, this is automatic. |
| **Implicit `aria-modal="true"`** | Screen readers recognize the dialog as modal without an explicit attribute. |

### What must be implemented manually

These three behaviors are NOT provided by `<dialog>` and must be handled by the implementation or a primitive library:

#### 1. Body scroll lock

`showModal()` does not prevent the background from scrolling. Use the CSS `:has()` selector to apply `overflow: hidden` on `<body>` when the dialog is open — no JS class toggling or cleanup needed:

```css
body:has(dialog#cart-drawer[open]) {
  overflow: hidden;
}
```

Watch for the scrollbar-gutter shift: when the scrollbar disappears, body width increases by the scrollbar's width. Primitive libraries typically handle this with `padding-right` compensation or `scrollbar-gutter: stable`.

#### 2. Backdrop click dismissal

The default `<dialog>` behavior does not close on backdrop click. The standard pattern detects clicks on the dialog element itself (as opposed to its children):

```js
dialog.addEventListener('click', (event) => {
  if (event.target === dialog) dialog.close();
});
```

Click events on child elements bubble to the dialog, but `event.target` remains the child — only direct clicks on the dialog element (i.e., the backdrop area) satisfy the condition.

**Preferred:** The `closedby` attribute provides native light dismiss. Setting `closedby="any"` enables both Escape and backdrop click dismissal natively. Browsers that do not support it ignore the attribute; keep an explicit close button as the always-available close mechanism.

#### 3. Exit animations

The hard problem: `close()` removes the dialog from the top layer immediately, making exit animations impossible with the standard approach.

Two strategies:

**CSS `@starting-style` + `allow-discrete` (modern browsers)**
```css
dialog[open] {
  transform: translateX(0);
  transition: transform 250ms, overlay 250ms allow-discrete, display 250ms allow-discrete;
}
@starting-style {
  dialog[open] { transform: translateX(100%); }
}
dialog:not([open]) {
  transform: translateX(100%);
}
```

**JavaScript-deferred close (broadest compatibility)**
Run the exit animation first, then call `dialog.close()` after the animation completes. This requires intercepting the native close flow (cancel the `cancel` event, run the animation, then close programmatically).

## Labeling

The drawer must have an accessible name. Use `aria-labelledby` pointing to the visible heading element:

```html
<dialog aria-labelledby="cart-drawer-title">
  <h2 id="cart-drawer-title">Cart</h2>
  ...
</dialog>
```

If additional context is useful for screen readers (e.g., item count), use `aria-describedby` pointing to a summary element.

## Keyboard interaction

With `<dialog>` + `showModal()` and semantic HTML, all keyboard interactions are native:

| Key | Behavior | Source |
|-----|----------|--------|
| Escape | Closes the dialog | Native (`cancel` → `close` events) |
| Tab | Moves focus to next focusable element inside dialog | Native (background is `inert`) |
| Shift+Tab | Moves focus to previous focusable element inside dialog | Native |
| Enter / Space | Activates the focused button or link | Native for `<button>`, `<a>`, `<input>` |

No additional keyboard handlers are needed if all interactive elements use semantic HTML (`<button>`, `<a>`, `<input>`). Custom elements that are not natively focusable require `tabindex="0"` and `role` attributes — prefer native elements instead.

## How primitive libraries handle these concerns

Primitive libraries (Radix UI, Base UI, Melt UI, Kobalte, Headless UI, etc.) implement the same accessibility contract described above. They abstract the manual work:

- **Focus containment**: Some libraries build their own focus trap from `<div>` + portal rather than using `<dialog>`. The result is equivalent — Tab cycles within the dialog, background is inert.
- **Scroll lock**: Libraries typically add `overflow: hidden` with scrollbar-gutter compensation automatically.
- **Backdrop click**: Handled via an overlay component with an `onClick` handler, or via the `closedby` attribute where supported.
- **Exit animations**: Libraries integrate with their framework's animation system (React transition groups, Svelte transitions, CSS animation hooks) to defer unmounting until the animation completes.
- **Focus restoration**: Most libraries implement their own, even though `<dialog>` handles it natively. This is because some libraries render from `<div>` + portal, not `<dialog>`.

The accessibility requirements are identical regardless of whether you use a library or native `<dialog>`. Libraries reduce implementation effort but don't change what must be true for the drawer to be accessible.
