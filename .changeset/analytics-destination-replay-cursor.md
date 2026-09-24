---
"@shopify/hydrogen": patch
---

Stop analytics destinations from receiving retained events again when they are removed and re-added under the same name. The bus now remembers each destination name's replay position, so a destination registered in a component effect no longer re-sends earlier events on remount or under React Strict Mode. A re-added destination resumes after the last event processed for its name (events of types it did not subscribe to still count as processed), and still receives retained events published while it was removed. A destination registered under a new name receives the full retained history, as before.

Destinations now also receive retained events in order, without skips within the 500-event buffer, when an event is published before a pending replay has run or from a destination callback, including across several callbacks of the same destination. Previously, either case could move a destination past retained events it had not received yet, and a destination added from a callback could receive the current event twice. Replay also stops as soon as analytics tracking is no longer allowed, rather than finishing the backlog, and a destination whose callbacks keep publishing during delivery now logs an error instead of hanging the page.
