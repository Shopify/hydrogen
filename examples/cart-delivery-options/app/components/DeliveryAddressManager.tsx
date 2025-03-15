import { useState } from 'react';
import { AddressesSelector } from './AddressesSelector'
import type { CartAddressFragment, CartApiQueryFragment } from 'storefrontapi.generated';
import { AddressActions } from './AddressActions'

export function DeliveryAddressManager({ cart }: { cart: CartApiQueryFragment }) {
  const otherAddresses = cart.delivery?.addresses
    .filter((address => !address.selected))
  const selectedAddress = cart.delivery.selectedAddress[0]

  const addresses = [selectedAddress, ...otherAddresses].filter(Boolean)
  const [activeAddress, setActiveAddress] = useState<CartAddressFragment | undefined>(selectedAddress || addresses[0])

  return (
    <div>
      <b>Addresses ({addresses.length})</b>
      {addresses && (
        <div style={{ display: 'flex' }}>
          <AddressesSelector
            addresses={addresses}
            selectedAddress={selectedAddress}
            onAddressChange={setActiveAddress}
          />
          <AddressActions activeAddress={activeAddress} />
        </div>
      )}
    </div >
  )
}
