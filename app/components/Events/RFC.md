# Events & Instrumentation RFC

### Goal
Moving away from Hydrogen v1 means that we have to offer a new instrumentation layer to emit all analytics events on Hydrogen v2.

## Events
- `page_view`: visited page or route
- `view_item`: View product details
- `view_item_list`: View of product impressions in a list or collection
- `select_item`: Click on a product or variant
- `view_cart`: View shopping cart / toggled cart
- `begin_checkout`: Initiate the checkout process
- `add_to_cart`: Add product to cart
- `applied_discount`: User applied a discount to the cart
- `remove_from_cart`: Remove product from the cart
- `login`: user authenticated
- `register`: user registered
- `view_search_results`: viewed search results

### Other events (out of scope)
- `newsletter_subscribe`: subscribed to the news letter
- `view_promotion`: When a user views a promotion
- `select_promotion`: When a user clicks on a promotion
- `add_to_wishlist`: added product to a wishlist

# Challenges
One of the
