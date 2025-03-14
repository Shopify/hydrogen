import { useState } from 'react';
import { AddressesSelector } from './AddressesSelector'
import type { CartAddressFragment, CartApiQueryFragment } from 'storefrontapi.generated';
import { AddressActions } from './AddressActions'

export function DeliveryAddressManager({ cart }: { cart: CartApiQueryFragment }) {
  console.log('all', cart.delivery.addresses)
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
      <br />
    </div >
  )
}

export function FormFields({ activeAddress }: { activeAddress?: CartAddressFragment }) {
  const address = activeAddress ? activeAddress.address : {} as CartAddressFragment['address']
  const selected = activeAddress ? activeAddress.selected : false
  return (
    <div style={{ display: 'flex', flexDirection: "column" }}>
      <fieldset>
        <label>First Name</label>
        <input type="text" name="firstName" defaultValue={address?.firstName ? address.firstName : undefined} />
      </fieldset>
      <fieldset>
        <label>Last Name</label>
        <input type="text" name="lastName" defaultValue={address?.lastName ? address.lastName : undefined} />
      </fieldset>
      <fieldset>
        <label>Address 1</label>
        <input type="text" name="address1" defaultValue={address?.address1 ? address.address1 : undefined} />
      </fieldset>
      <fieldset>
        <label>Address 2</label>
        <input type="text" name="address2" defaultValue={address?.address2 ? address.address2 : undefined} />
      </fieldset>
      <fieldset>
        <label>City</label>
        <input type="text" name="city" defaultValue={address?.city ? address.city : undefined} />
      </fieldset>
      <fieldset>
        <label>Province</label>
        <input type="text" name="provinceCode" defaultValue={address?.provinceCode ? address.provinceCode : undefined} />
      </fieldset>
      <fieldset>
        <label>Zip</label>
        <input type="text" name="zip" defaultValue={address?.zip ? address.zip : undefined} />
      </fieldset>
      <fieldset>
        <label>Country</label>
        <input type="text" minLength={2} maxLength={2} name="countryCode" defaultValue={address?.countryCode ? address.countryCode : undefined} />
      </fieldset>
      <fieldset>
        <label>Make default</label>
        <input type="checkbox" name="selected" defaultChecked={selected} />
      </fieldset>
    </div>
  )
}

export function AddressForm({ action, children, inputs: passedInputs }: {
  action: 'CartDeliveryAddressesAdd' | 'CartDeliveryAddressesUpdate' | 'CartDeliveryAddressesRemove'
  inputs?: Record<string, any>;
  children: () => JSX.Element;
}) {
  const inputs = JSON.stringify({ action, inputs: passedInputs })
  return (
    <form id={action} action="/cart" method="post">
      <input type="hidden" name="cartFormInput" defaultValue={inputs} />
      {children()}
    </form>
  )
}
