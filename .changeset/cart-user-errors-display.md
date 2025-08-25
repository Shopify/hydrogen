---
'skeleton': patch
---

Display cart user errors in the skeleton template

Cart mutations return user errors (such as invalid discount codes or gift cards) but these were not being displayed to users. This change adds a CartUserErrors component that renders these errors, similar to how cart warnings are displayed. The implementation supports all cart error types including CartUserError, MetafieldsSetUserError, and MetafieldDeleteUserError.