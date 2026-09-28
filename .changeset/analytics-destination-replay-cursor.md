---
"@shopify/hydrogen": patch
---

Stop analytics destinations from receiving retained events again when they are removed and re-added under the same name, so a destination registered in a component effect no longer re-sends earlier events on remount or under React Strict Mode. A re-added name resumes where it left off; a new name still receives the full retained history.

Destinations now also receive retained events in order when events are published from a callback or before a pending replay has run. Previously, either case could skip retained events or deliver the current event twice. This holds while the backlog fits in the 500-event buffer. Replay now stops as soon as tracking is no longer allowed, and a callback that keeps publishing during delivery now logs an error instead of hanging the page.
