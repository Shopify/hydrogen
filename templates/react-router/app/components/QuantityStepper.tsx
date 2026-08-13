import { useRef } from "react";

/**
 * Plus/minus quantity stepper for the PDP add-to-cart form. The product form
 * `register` only accepts `merchandiseId`/`quantity`/`optionValue`/`addToCart`,
 * so unlike the cart line form (which registers `increase`/`decrease` submit
 * intents) the PDP needs local +/- buttons around its quantity input.
 *
 * Progressive enhancement: the number `<input>` is the no-JS baseline (a real,
 * editable, submittable field). The `–`/`+` buttons are `type="button"` UI
 * affordances that update the input value and dispatch a native `input` event
 * so any framework form binding listening on the input stays in sync. With JS
 * off, the buttons do nothing and the input remains fully usable.
 *
 * Visual: `quantity-selector-outlined` + a reduced height (`h-9`) and a wider
 * number field (`w-12`) so the digits aren't cramped relative to the buttons.
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
};

export function QuantityStepper<T extends React.InputHTMLAttributes<HTMLInputElement>>({
  inputProps,
  label,
  min = 1,
  step = 1,
  className = "",
}: QuantityStepperProps<T>) {
  const inputRef = useRef<HTMLInputElement>(null);

  const nudge = (delta: number) => {
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
        className="button-icon h-8 w-9 rounded-s"
        aria-label={`Decrease ${label}`}
      >
        –
      </button>
      <input
        ref={inputRef}
        type="number"
        {...inputProps}
        className="number-reset h-8 w-12 text-center text-sm"
        aria-label={label}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        inputMode="numeric"
      />
      <button
        type="button"
        onClick={() => nudge(1)}
        className="button-icon h-8 w-9 rounded-e"
        aria-label={`Increase ${label}`}
      >
        +
      </button>
    </div>
  );
}
