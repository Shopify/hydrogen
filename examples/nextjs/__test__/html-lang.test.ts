import assert from "node:assert/strict";
import test from "node:test";

import { toHtmlLang } from "../lib/html-lang.ts";

test("converts Shopify language codes to BCP 47 tags", () => {
  assert.equal(toHtmlLang("EN"), "en");
  assert.equal(toHtmlLang("PT_BR"), "pt-BR");
  assert.equal(toHtmlLang("PT_PT"), "pt-PT");
  assert.equal(toHtmlLang("ZH_CN"), "zh-Hans");
  assert.equal(toHtmlLang("ZH_TW"), "zh-Hant");
});
