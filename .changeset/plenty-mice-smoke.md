---
'@shopify/cli-hydrogen': patch
---

Fixes issue where routes that begin with the url `/events` could not be created because an internal handler had claimed those routes already. The internal handler now listens at `/__minioxygen_events` so hopefully that doesn't conflict with anyone now. :)
