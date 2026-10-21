import { css, on, type Handle, type RemixNode } from "remix/component";

import { resetButton } from "./styles.ts";

const asideStyle = css({
  background: "var(--color-light)",
  border: "0",
  boxShadow: "0 0 50px rgba(0, 0, 0, 0.3)",
  height: "100vh",
  inset: "0 0 0 auto",
  margin: "0",
  maxHeight: "none",
  maxWidth: "none",
  padding: "0",
  position: "fixed",
  width: "min(var(--aside-width), 100vw)",
  "&::backdrop": { background: "rgba(0, 0, 0, 0.2)" },
  "& header": {
    alignItems: "center",
    borderBottom: "1px solid var(--color-dark)",
    display: "flex",
    height: "var(--header-height)",
    justifyContent: "space-between",
    padding: "0 20px",
  },
  "& header h3": { margin: "0" },
  "& p": { margin: "0 0 0.25rem" },
  "& p:last-child": { margin: "0" },
  "& li": { marginBottom: "0.125rem" },
});

const closeStyle = css({
  fontWeight: "bold",
  opacity: "0.8",
  textDecoration: "none",
  transition: "all 200ms",
  width: "20px",
  "&:hover": { opacity: "1" },
});

const bodyStyle = css({ margin: "1rem" });

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
        // `closeAsides()` finds open drawers by this class.
        class="aside"
        aria-labelledby={headingId}
        mix={[
          asideStyle,
          on("click", (event) => {
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
          }),
        ]}
      >
        <header>
          <h3 id={headingId}>{heading}</h3>
          <button
            type="button"
            aria-label="Close"
            mix={[closeStyle, resetButton, on("click", closeAsides)]}
          >
            &times;
          </button>
        </header>
        <div mix={bodyStyle}>{children}</div>
      </dialog>
    );
  };
}
