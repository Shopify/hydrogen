// SPIKE ONLY (agentic storefront E2E). A healthy-but-hostile UX variant: a modal sign-up
// dialog opens on load and blocks the page until the shopper dismisses it.
import { useEffect, useRef } from "react";

export function SpikeNewsletterModal() {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const close = () => dialogRef.current?.close();

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="spike-newsletter-title"
      className="bg-surface text-on-surface m-auto max-w-md rounded p-8 backdrop:bg-black/60"
    >
      <h2 id="spike-newsletter-title" className="type-display mb-2 text-2xl">
        Get 10% off your first order
      </h2>
      <p className="text-on-surface-secondary mb-6 text-sm">
        Join our newsletter for early access to new arrivals.
      </p>
      <form
        method="dialog"
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          close();
        }}
      >
        <label className="text-sm font-medium" htmlFor="spike-newsletter-email">
          Email
        </label>
        <input
          id="spike-newsletter-email"
          type="email"
          required
          className="border-border rounded-input border px-3 py-2"
        />
        <button
          type="submit"
          className="rounded-button button-primary h-11 px-4 text-sm font-medium"
        >
          Subscribe
        </button>
        <button
          type="button"
          onClick={close}
          className="text-on-surface-secondary h-11 text-sm underline"
        >
          No thanks
        </button>
      </form>
    </dialog>
  );
}
