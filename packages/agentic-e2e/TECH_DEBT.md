# Technical debt

## Locale and market

### Decision

Ship the basic tests using the default locale that the Storefront API reports. Defer locale edge cases. In a follow-up, first check whether the storefront has more than one locale before adding extra locale resolution.

### Current behavior

- [`storefront.ts`](./src/shopify/storefront.ts) sends one `localization` query without `@inContext`. It reads the country and language codes, the country name, the language's own name (`endonymName`, such as `Français`), and the currency that the API makes active by default. It sends no buyer-IP header, but a proxy at the origin can add one. The command uses the returned context as the run's target; it does not establish that this is the shop's primary market.
- [`catalog.ts`](./src/shopify/catalog.ts) pins the variant with `@inContext` set to that country code and language code.
- The CLI accepts only the storefront root URL, so locale routes such as `/en-ca` are not supported. It opens `<origin>/products/<handle>` in a fresh browser profile. It sets no locale cookie, no `--lang` flag, and no market.
- [`objective.ts`](./src/agent/objective.ts) names the target country name, language name (not the code), and currency in the task. It tells the agent to switch if the store shows another country, language, or currency. The [system prompt](./src/agent/stagehand-agent.ts) tells it to keep the store's country, language, and currency unless the task asks for a change.
- The status comes from add events, not from the agent's report. Nothing checks the market or the language in the browser, and the cart is not read.

The language prompt, with the language's own name, is done (PR review: [target language](https://github.com/Shopify/hydrogen/pull/4357#discussion_r4551172891)). Independent verification of the browser locale is not done.

### Open issues

1. **API and browser can differ.** Geo-IP, locale routes, and browser request settings can make the page show another market than the API context. The effect of a buyer-IP header from a proxy is not confirmed ([review](https://github.com/Shopify/hydrogen/pull/4357#discussion_r4551172909)).
2. **Translated labels.** The product title and option names and values come from the pinned context. The country name is in the API's language. The language name is its own name, but a selector can show another label, such as a code. The visible page can use other strings, so the agent may not find a match.
3. **No usable selector.** A store can have no locale or country selector, or one that the agent cannot use. The agent can then add the item in another market, and the add event can still give `pass` ([review](https://github.com/Shopify/hydrogen/pull/4357#discussion_r4551172927)).
4. **Reliable browser locale evidence.** There is no chosen source for the locale that the browser shows. Candidates to investigate, not confirmed to work:
   - Read the locale from the HTML response, without JavaScript.
   - Read it from a storefront manifest endpoint.
5. **Align the pin to the browser.** If the browser locale differs from the API context, it is not decided whether to repin the variant in the browser locale, switch the browser, or report a mismatch.
6. **Single-locale fast path.** If a storefront has only one locale, no extra resolution should be needed. How to detect this reliably is not decided. Storefronts with more than one locale need a follow-up.

### Future verification cases

| Case                                | What to check                                                  |
| ----------------------------------- | -------------------------------------------------------------- |
| Same locale                         | The browser shows the API context. No switch is needed.         |
| Different language, same country    | The agent switches the language, or the run reports a mismatch. |
| Different market                    | The agent switches the country and currency.                   |
| No selector                         | The run does not give `pass` for an add in another market.      |
| Switch changes variant availability | The pinned variant is still eligible after the switch.         |

### Undecided

- The status to report when the browser locale cannot be confirmed or does not match.
- Whether a mismatch stops the run before the agent starts.
- This document adds no new stop rule and no new status guarantee.

## Theme add errors

### Problem

The add check trusts the add event's promise result: `cart`, `userErrors`, and stock or availability `warnings`. On a declined add, Horizon's product form dispatches `shopify:cart:error`, fetches the unchanged cart, and resolves the add promise with that cart and `detail.didError: true`, but with no `userErrors` ([product-form.js](https://github.com/Shopify/horizon/blob/c531fd5bb8904e7f871c308b15c64a7cb0de8e20/assets/product-form.js#L430-L490)). The command then gives a false `pass`. Hydrogen's standard cart flow is not affected, because its result comes from the Storefront API mutation.

### Possible approaches

1. Fail when `shopify:cart:error` is dispatched between the add event and its result. It is a standard event. Risk: an error from another app's cart change during the add gives a false `fail`.
2. Ask Horizon to report declined adds in `userErrors`, as the [`shopify:cart:lines-update` contract](https://shopify.dev/docs/api/storefront-events-and-actions/events/cart-lines-update) describes.
3. Read the session cart after the add (the dropped approach of #4351).

### Done when

A decision on whether themes are in scope is recorded here, and either a rule fails this case or the README states that themes that resolve declined adds without `userErrors` are not supported.
