---
'@shopify/hydrogen': patch
---

Add `locale` parameter to Customer Account login

Adds a new optional `locale` parameter to the `customerAccount.login()` method. This parameter sets the `locale` query parameter on the OAuth authorization URL to control the language of the login page.

Supported locale values: `en`, `fr`, `cs`, `da`, `de`, `el`, `es`, `fi`, `hi`, `hr`, `hu`, `id`, `it`, `ja`, `ko`, `lt`, `ms`, `nb`, `nl`, `pl`, `pt-BR`, `pt-PT`, `ro`, `ru`, `sk`, `sl`, `sv`, `th`, `tr`, `vi`, `zh-CN`, `zh-TW`.

The `locale` parameter takes precedence over `uiLocales`. When `locale` is set (either via the `locale` option or derived from the `language` configuration), the `ui_locales` parameter will not be appended to the login URL. The `uiLocales` option will only be used as a fallback when `locale` is not set.

### Usage

```tsx
// Using locale option directly
await context.customerAccount.login({
  locale: 'fr',
});

// Using locale with regional variant
await context.customerAccount.login({
  locale: 'zh-CN',
});

// locale takes precedence over uiLocales
await context.customerAccount.login({
  locale: 'de',
  uiLocales: 'FR', // This will be ignored
});
```

The locale value is normalized automatically:
- Lowercase languages: `'FR'` → `'fr'`
- Regional variants: `'ZH_CN'` or `'zh-cn'` → `'zh-CN'`

### Migration

This is a non-breaking change. Existing implementations using `uiLocales` will continue to work.

