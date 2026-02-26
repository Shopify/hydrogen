---
'@shopify/hydrogen': patch
---

Fixed cart analytics events (`product_added_to_cart`, `cart_updated`) being silently dropped since 2025.7.1. A race condition between consent initialization and cart resolution caused events to be lost when the Customer Privacy SDK hadn't loaded yet. The internal event queue now correctly buffers all events until consent state is determined, preserving multiple events of the same type in FIFO order.
