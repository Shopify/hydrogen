import type {CartWarning, CartWarningCode} from '@shopify/hydrogen-react/storefront-api-types';

type CartWarningsProps = {
  warnings?: CartWarning[];
};

export function CartWarnings({warnings}: CartWarningsProps) {
  if (!warnings || warnings.length === 0) {
    return null;
  }

  return (
    <div className="cart-warnings" role="alert">
      <h4>Warnings</h4>
      <ul>
        {warnings.map((warning) => (
          <li key={`${warning.code}-${warning.message}`}>
            {formatWarningMessage(warning)}
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatWarningMessage(warning: CartWarning): string {
  // Map all cart warning codes to user-friendly messages
  const WARNING_MESSAGES: Partial<Record<CartWarningCode, string>> = {
    // Discount warnings
    DISCOUNT_CODE_NOT_HONOURED: 'This discount code cannot be applied',
    DISCOUNT_CURRENTLY_INACTIVE: 'This discount code is currently inactive',
    DISCOUNT_CUSTOMER_NOT_ELIGIBLE: 'You are not eligible for this discount',
    DISCOUNT_CUSTOMER_USAGE_LIMIT_REACHED: 'You have reached the usage limit for this discount',
    DISCOUNT_ELIGIBLE_CUSTOMER_MISSING: 'Please log in to use this discount',
    DISCOUNT_INCOMPATIBLE_PURCHASE_TYPE: 'This discount is not compatible with your purchase type',
    DISCOUNT_NOT_FOUND: 'This discount code was not found',
    DISCOUNT_NO_ENTITLED_LINE_ITEMS: 'This discount does not apply to any items in your cart',
    DISCOUNT_NO_ENTITLED_SHIPPING_LINES: 'This discount does not apply to your shipping method',
    DISCOUNT_PURCHASE_NOT_IN_RANGE: 'Your purchase amount is not within the range for this discount',
    DISCOUNT_QUANTITY_NOT_IN_RANGE: 'Your quantity is not within the range for this discount',
    DISCOUNT_USAGE_LIMIT_REACHED: 'This discount has reached its usage limit',
    
    // Inventory warnings
    MERCHANDISE_NOT_ENOUGH_STOCK: 'Limited stock available - quantity has been adjusted',
    MERCHANDISE_OUT_OF_STOCK: 'This item is no longer available and has been removed from your cart',
    
    // Delivery warnings
    DUPLICATE_DELIVERY_ADDRESS: 'This delivery address already exists in your cart',
    
    // Payment warnings
    PAYMENTS_GIFT_CARDS_UNAVAILABLE: 'Gift cards cannot be used for this order',
  };
  
  // Return mapped message if available, otherwise fall back to the API message
  return WARNING_MESSAGES[warning.code as CartWarningCode] || warning.message;
}