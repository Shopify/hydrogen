/**
 * Copy strings transcribed from `examples/core/content.json`. Centralized so
 * the React Router example uses the same verified copy as the other examples.
 */
export const content = {
  announcement: {
    label: "Announcement",
    text: "Free shipping on orders over $50",
  },
  general: {
    skipToContent: "Skip to content",
    search: "Search",
    account: "Account",
    back: "Back",
    close: "Close",
    drawer: "Drawer",
    dismiss: "Dismiss",
  },
  header: {
    menu: "Menu",
    navigation: "Main navigation",
    mobileNavigation: "Mobile navigation",
    navItems: ["Collections", "Men", "Women", "Accessories"] as const,
  },
  footer: {
    quickLinks: "Quick links",
    customerCare: "Customer care",
    search: "Search",
    account: "Account",
    paymentMethods: "Payment methods",
  },
  cart: {
    title: "Cart",
    checkout: "Checkout",
    empty: "Your cart is empty.",
    emptyDescription: "Looks like you haven't added anything to your cart yet.",
    totalLabel: "Estimated total",
    taxesAndShippingAtCheckout: "Taxes and shipping calculated at checkout",
    itemRemoved: "Item removed from cart",
    updated: "Cart updated",
    updateError: "Could not update cart. Please try again.",
    iconLabel: {
      one: "Cart (1 item)",
      other: "Cart ({{ count }} items)",
    },
    itemCount: {
      one: "1 item in cart",
      other: "{{ count }} items in cart",
    },
  },
  product: {
    details: "Product details",
    quantity: "Quantity",
    addToCart: "Add to cart",
    selectOptions: "Select options",
    addedToCart: "Added to cart",
    soldOut: "Out of stock",
    description: "Description",
    relatedProducts: "You may also like",
    badge: {
      soldOut: "Sold out",
      sale: "Sale",
    },
    inventory: {
      inStock: "In stock",
      lowStock: "Low stock",
      lowStockCount: "Only {{ count }} left in stock",
      outOfStock: "Out of stock",
    },
  },
  collection: {
    title: "Outerwear",
    description:
      "Layering pieces built for shifting weather — midweight overshirts, field jackets, and knitwear cut from durable natural fibers.",
    productsCount: {
      one: "1 product",
      other: "{{ count }} products",
    },
    sortBy: "Sort by",
    filters: "Filters",
    filter: "Filter",
    showResults: "Show results",
    clearAll: "Clear all",
    activeFilters: "Active filters",
    removeFilter: "Remove {{ filter }} filter",
    priceMin: "Min",
    priceMax: "Max",
    priceTo: "to",
    loadMore: "Load more",
    showingCount: "Showing {{ shown }} of {{ total }} products",
    noProducts: "No products found.",
  },
  collections: {
    title: "Collections",
    allCollections: "All collections",
    productCount: {
      one: "1 product",
      other: "{{ count }} products",
    },
    viewCollection: "View {{ title }}",
  },
  search: {
    title: "Search",
    placeholder: "Search",
    label: "Search",
    submit: "Search",
    clear: "Clear search",
    resultsFor: "{{ count }} results found for {{ terms }}",
    showingCount: "Showing {{ shown }} of {{ total }} results",
    loadMore: "Load more",
    noResults: "No results found for {{ terms }}",
    noResultsSuggestion: "Check your spelling or try a more general term.",
    noResultsAnnouncement: "No results found for {{ terms }}",
  },
  home: {
    hero: {
      heading: "Discover our latest collection",
      subtitle: "Explore our curated selection of premium products",
      primaryCta: "Shop now",
      secondaryCta: "Learn more",
    },
    bestSellers: "Best sellers",
    shopByCategory: "Shop by category",
    viewAll: "View all",
  },
  consent: {
    label: "Cookie consent",
    message: "We use cookies to improve your experience, analyze traffic, and personalize content.",
    privacyPolicy: "Privacy Policy",
    acceptAll: "Accept all",
    decline: "Decline",
    managePreferences: "Manage preferences",
  },
} as const;

/** Pluralized cart icon label. */
export function cartIconLabel(count: number): string {
  return count === 1
    ? content.cart.iconLabel.one
    : content.cart.iconLabel.other.replace("{{ count }}", String(count));
}

/** Pluralized cart item-count live-region text. */
export function cartItemCount(count: number): string {
  return count === 1
    ? content.cart.itemCount.one
    : content.cart.itemCount.other.replace("{{ count }}", String(count));
}
