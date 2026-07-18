import { useRef } from "react";

/**
 * Shared plus/minus quantity stepper — used by the PDP add-to-cart form and the
 * cart line-item form so both surfaces share one control (per feedback: same
 * picker on the product page as in the cart).
 *
 * Progressive enhancement: the number `<input>` is the no-JS baseline (a real,
 * editable, submittable field). The `–`/`+` buttons are `type="button"` UI
 * affordances that update the input value and dispatch a native `input` event
 * so any framework form binding listening on the input stays in sync. With JS
 * off, the buttons do nothing and the input remains fully usable.
 *
 * Visual: `quantity-selector-outlined` with 44px `button-icon` touch targets
 * and a compact `w-12` number field so the digits aren't cramped.
 */
type QuantityStepperProps<T extends React.InputHTMLAttributes<HTMLInputElement>> = {
  /** Props spread onto the number `<input>` (e.g. a form `register(...)` spread). */
  inputProps: T;
  /** Accessible label for the group + controls, e.g. "Quantity: Hoodie". */
  label: string;
  /** Minimum value (defaults to 1). */
  min?: number;
  /** Step size (defaults to 1). */
  step?: number;
  /** Class appended to the outer group. */
  className?: string;
  /** Prevent changes while the owning mutation is in flight. */
  disabled?: boolean;
};

export function QuantityStepper<T extends React.InputHTMLAttributes<HTMLInputElement>>({
  inputProps,
  label,
  min = 1,
  step = 1,
  className = "",
  disabled = false,
}: QuantityStepperProps<T>) {
  const inputRef = useRef<HTMLInputElement>(null);

  const nudge = (delta: number) => {
    if (disabled) return;
    const input = inputRef.current;
    if (!input) return;
    const next = Math.max(min, (Number(input.value) || min) + delta * step);
    input.value = String(next);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  };

  return (
    <div
      className={`quantity-selector-outlined inline-flex items-center rounded ${className}`}
      role="group"
      aria-label={label}
    >
      <button
        type="button"
        onClick={() => nudge(-1)}
        disabled={disabled}
        className="button-icon rounded-s disabled:opacity-40"
        aria-label={`Decrease ${label}`}
      >
        –
      </button>
      <input
        ref={inputRef}
        type="number"
        {...inputProps}
        disabled={disabled}
        className="number-reset h-8 w-12 text-center text-sm outline-none focus:outline-none disabled:opacity-40"
        aria-label={label}
      />
      <button
        type="button"
        onClick={() => nudge(1)}
        disabled={disabled}
        className="button-icon rounded-e disabled:opacity-40"
        aria-label={`Increase ${label}`}
      >
        +
      </button>
    </div>
  );
}
