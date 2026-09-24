---
"@shopify/hydrogen": patch
---

Stop analytics destinations from receiving retained events again when they are removed and re-added under the same name. The bus now remembers each destination name's replay position, so a destination registered in a component effect no longer re-sends earlier events on remount or under React Strict Mode. A re-added destination still receives retained events published while it was removed. A destination registered under a new name receives the full retained history, as before.
