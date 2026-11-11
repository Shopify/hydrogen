---
"@shopify/hydrogen": minor
---

Add `getHtmlLang`, which converts a Shopify language code into the BCP 47 tag for the `<html lang>` attribute. Shopify's regional codes no longer produce invalid tags such as `pt_br`.

```tsx
import { getHtmlLang } from "@shopify/hydrogen";

<html lang={getHtmlLang(requestContext.locale.language)}>;
// EN -> "en", PT_BR -> "pt-BR", ZH_TW -> "zh-Hant"
```

It takes the language only: `<html lang>` names the language the page is written in, not the market country.
