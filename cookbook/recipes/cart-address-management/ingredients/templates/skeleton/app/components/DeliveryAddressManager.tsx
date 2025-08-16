import {useState} from 'react';
import {AddressesSelector} from './AddressesSelector';
import type {
  CartAddressFragment,
  CartApiQueryFragment,
} from 'storefrontapi.generated';
import {type OptimisticCart} from '@shopify/hydrogen';
import {AddressActions} from './AddressActions';
import type {CartSelectableAddress} from '@shopify/hydrogen/storefront-api-types';

type ParsedAddresses = {
  selectedAddress: null | CartSelectableAddress;
  otherAddresses: CartSelectableAddress[];
};

type DeliveryAddressManagerProps = {
  cart: OptimisticCart<CartApiQueryFragment | null>;
};

/**
 * Component that manages delivery addresses for a cart.
 * This component displays a list of delivery addresses associated with the cart,
 * allows the user to select an address, and provides actions for the selected address.
 * @param props.cart - The cart object containing delivery information and addresses
 */
export function DeliveryAddressManager({cart}: DeliveryAddressManagerProps) {
  const defaultAddreses: ParsedAddresses = {
    selectedAddress: null,
    otherAddresses: [],
  };
  const {selectedAddress, otherAddresses} =
    (cart?.delivery?.addresses || []).reduce((acc, address) => {
      if (address.selected) {
        acc.selectedAddress = address;
      } else {
        acc.otherAddresses.push(address);
      }
      return acc;
    }, defaultAddreses) || defaultAddreses;

  const addresses = [selectedAddress, ...otherAddresses].filter(Boolean);
  const [activeAddress, setActiveAddress] = useState<
    CartAddressFragment | undefined
  >(selectedAddress || addresses[0]);

  const cartHasItems = Boolean(cart?.totalQuantity && cart?.totalQuantity > 0);

  return (
    <div style={{marginTop: '1rem'}}>
      <h4>Addresses ({addresses.length})</h4>
      {cartHasItems && addresses ? (
        <div style={{display: 'flex', flexDirection: 'column'}}>
          <AddressesSelector
            addresses={addresses}
            selectedAddress={selectedAddress}
            onAddressChange={setActiveAddress}
          />
          <AddressActions activeAddress={activeAddress} />
          <br />
        </div>
      ) : (
        <p>Updating..</p>
      )}
    </div>
  );
}
