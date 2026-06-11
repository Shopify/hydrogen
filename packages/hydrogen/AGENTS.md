# Hydrogen dev-preview development notes

## When designing APIs
- Deep modules, small API surface: the fewest amount of arguments/options necessary for functions and constructors
- Make holding it wrong impossible: if there is a way to misuse your API by accident, it is designed wrong.

## When writing documentation
- Do not over-document. If the Typescript LSP covers it, do not add thorough documentation. E.g.: listing the entire list of exports of a module, interfaces etc.

## When writing code
- Keep bundle size to a minimum: no unnecessary libraries, no unnecessary guards, no verbosity. Use tree-shaking and lazy loading to your advantage.

## When writing UI code
- Display errors or warnings the closest to the element they represent. An error message for a line item in the cart should go next to the line item itself
- NEVER calculate currency amounts on the client: users may feel frustrated if they see monetary quantities that do not match what they expect. If an amount is not the most up to date, visually indicate it by displaying pending UI, not pre-emptively calculating amounts.
- NEVER Block optimistic interactions. If I can increase a line item’s quantity in my cart in an optimistic way by clicking on the 'increase quantity' button, this button should never be disabled.
- ALWAYS visually indicate what data is out of date in a view. Rules of contrast can be disregarded. Pending UI (even if textual) is the equivalent of an image: it does not aim to be read, but to signal the user and hold place for the true value.
