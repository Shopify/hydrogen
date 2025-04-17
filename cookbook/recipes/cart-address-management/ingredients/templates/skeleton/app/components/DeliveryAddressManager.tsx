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
  cart: CartApiQueryFragment | OptimisticCart | null;
};

export function DeliveryAddressManager({cart}: DeliveryAddressManagerProps) {
  const defaultAddreses: ParsedAddresses = {
    selectedAddress: null,
    otherAddresses: [],
  };
  const {selectedAddress, otherAddresses} =
    cart?.delivery?.addresses.reduce((acc, address) => {
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

  return (
    <div style={{marginTop: '1rem'}}>
      <h4>Addresses ({addresses.length})</h4>
      {addresses && (
        <div style={{display: 'flex', flexDirection: 'column'}}>
          <AddressesSelector
            addresses={addresses}
            selectedAddress={selectedAddress}
            onAddressChange={setActiveAddress}
          />
          <AddressActions activeAddress={activeAddress} />
          <br />
        </div>
      )}
    </div>
  );
}
