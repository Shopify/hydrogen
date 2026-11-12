# Technical debt

## Locale and market

### Decision

Ship the basic tests using the default locale that the Storefront API reports. Defer locale edge cases. In a follow-up, first check whether the storefront has more than one locale before adding extra locale resolution.

### Current behavior

- [`storefront.ts`](./src/shopify/storefront.ts) sends one `localization` query without `@inContext`. It reads the country, language, country name, and currency that the API makes active by default. It sends no buyer-IP header, but a proxy at the origin can add one. The command uses the returned context as the run's target; it does not establish that this is the shop's primary market.
- [`catalog.ts`](./src/shopify/catalog.ts) pins the variant with `@inContext` set to that country and language.
- The CLI accepts only the storefront root URL, so locale routes such as `/en-ca` are not supported. It opens `<origin>/products/<handle>` in a fresh browser profile. It sets no locale cookie, no `--lang` flag, and no market.
- [`objective.ts`](./src/agent/objective.ts) names the target country, language code, and currency in the task. It tells the agent to switch if the store shows another country, language, or currency. The [system prompt](./src/agent/stagehand-agent.ts) tells it to keep the store's country, language, and currency unless the task asks for a change.
- `agent-completed` is the agent's own report. Nothing checks the market, the language, or the cart in the browser.

The language prompt is done (PR review: [target language](https://github.com/Shopify/hydrogen/pull/4357#discussion_r4551172891)). Independent verification of the browser locale is not done.

### Open issues

1. **API and browser can differ.** Geo-IP, locale routes, and browser request settings can make the page show another market than the API context. The effect of a buyer-IP header from a proxy is not confirmed ([review](https://github.com/Shopify/hydrogen/pull/4357#discussion_r4551172909)).
2. **Translated labels.** The product title and option names and values come from the pinned context. The country name is in the API's language. The visible page can use other strings, so the agent may not find a match.
3. **No usable selector.** A store can have no locale or country selector, or one that the agent cannot use. The agent can then report completion in another market ([review](https://github.com/Shopify/hydrogen/pull/4357#discussion_r4551172927)).
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
| No selector                         | The run does not report a false completion in another market.   |
| Switch changes variant availability | The pinned variant is still eligible after the switch.         |

### Undecided

- The status to report when the browser locale cannot be confirmed or does not match.
- Whether a mismatch stops the run before the agent starts.
- This document adds no new stop rule and no new status guarantee.
