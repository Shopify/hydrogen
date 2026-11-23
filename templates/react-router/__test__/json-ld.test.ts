import assert from "node:assert/strict";
import test from "node:test";

import { jsonLdScript } from "../app/lib/json-ld.ts";

test("escapes `<` so a value cannot close the script element", () => {
  const html = jsonLdScript({ name: "</script><script>alert(1)</script><!--" });

  assert.equal(html.includes("<"), false);
});

test("round-trips through JSON.parse", () => {
  const data = {
    "@type": "BreadcrumbList",
    itemListElement: [{ name: 'Tees & "Tanks" </script>', position: 1 }],
  };

  assert.deepEqual(JSON.parse(jsonLdScript(data)), data);
});
