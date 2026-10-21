import { on, type Handle, type RemixNode } from "remix/component";

export type AsideType = "cart" | "search" | "mobile";

export function asideId(type: AsideType) {
  return `aside-${type}`;
}

/** Opens one aside and closes any other. Asides are native modal dialogs. */
export function openAside(type: AsideType) {
  const dialog = document.getElementById(asideId(type));
  if (!(dialog instanceof HTMLDialogElement) || dialog.open) return;
  closeAsides();
  dialog.showModal();
}

export function closeAsides() {
  for (const dialog of document.querySelectorAll<HTMLDialogElement>("dialog.aside[open]")) {
    dialog.close();
  }
}

/**
 * The side drawer used for the cart, predictive search, and the mobile menu. A native
 * `<dialog>` provides focus trapping, Escape to close, and the backdrop.
 */
export function AsideDialog(
  handle: Handle<{ type: AsideType; heading: string; children?: RemixNode }>,
) {
  return () => {
    const { children, heading, type } = handle.props;
    const headingId = `${asideId(type)}-heading`;

    return (
      <dialog
        id={asideId(type)}
        class="aside"
        aria-labelledby={headingId}
        mix={on("click", (event) => {
          // Backdrop clicks target the dialog, but so do clicks on its empty space, so
          // only clicks outside the dialog's box close it.
          const dialog = event.currentTarget;
          if (event.target !== dialog) return;
          const rect = dialog.getBoundingClientRect();
          const isInside =
            event.clientX >= rect.left &&
            event.clientX <= rect.right &&
            event.clientY >= rect.top &&
            event.clientY <= rect.bottom;
          if (!isInside) dialog.close();
        })}
      >
        <header>
          <h3 id={headingId}>{heading}</h3>
          <button
            type="button"
            class="close reset"
            aria-label="Close"
            mix={on("click", closeAsides)}
          >
            &times;
          </button>
        </header>
        <div class="aside-body">{children}</div>
      </dialog>
    );
  };
}
