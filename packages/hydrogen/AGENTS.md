# Hydrogen dev-preview development notes

## When designing APIs
- Deep modules, small API surface: the fewest amount of arguments/options necessary for functions and constructors
- Make holding it wrong impossible: if there is a way to misuse your API by accident, it is designed wrong.

## When writing documentation
- Do not over-document. If the Typescript LSP covers it, do not add thorough documentation. E.g.: listing the entire list of exports of a module, interfaces etc.
- Write packaged skills from the consumer project's perspective. Do not reference repository-only paths under `examples/` or `templates/`.

## When writing packaged skills

Every piece of guidance has exactly one owner. Duplication between skills is how they drift apart, and the copies stop agreeing long before anyone notices.

- **A domain skill owns its API.** `hydrogen-analytics` owns analytics, `hydrogen-variant-form` owns the product form. Teach it there, once.
- **`hydrogen-setup` steps orchestrate, they do not teach.** A step names the order, the prerequisites, and the choices that only matter during setup, then invokes the domain skill. If a step is explaining an API, that content belongs in the skill it should have invoked.
- **`SKILL.md` holds what every consumer needs; `references/` holds what only some do.** Framework bindings, deep topics, and troubleshooting go in `references/` so they load only when the task reaches them. List each reference from `SKILL.md` with a sentence saying when to read it — an unlisted reference is invisible.
- **One framework, one reference file.** When a framework needs its own recipe, give it `references/<framework>.md`. If it builds on a more general one, say so at the top of the file and keep the shared material in the general file.
- **Restate nothing.** Cross-reference another skill by name instead of summarizing it. A summary is a second copy.

## When writing code
- Keep bundle size to a minimum: no unnecessary libraries, no unnecessary guards, no verbosity. Use tree-shaking and lazy loading to your advantage.

## When writing UI code
- Display errors or warnings the closest to the element they represent. An error message for a line item in the cart should go next to the line item itself
- NEVER calculate currency amounts on the client: users may feel frustrated if they see monetary quantities that do not match what they expect. If an amount is not the most up to date, visually indicate it by displaying pending UI, not pre-emptively calculating amounts.
- NEVER Block optimistic interactions. If I can increase a line item’s quantity in my cart in an optimistic way by clicking on the 'increase quantity' button, this button should never be disabled.
- ALWAYS visually indicate what data is out of date in a view. Rules of contrast can be disregarded. Pending UI (even if textual) is the equivalent of an image: it does not aim to be read, but to signal the user and hold place for the true value.
