import type { CartAddressFragment } from 'storefrontapi.generated';

export function AddressesSelector({ addresses, selectedAddress, onAddressChange }: {
  addresses: Array<CartAddressFragment>, selectedAddress: CartAddressFragment | undefined, onAddressChange?: React.Dispatch<React.SetStateAction<CartAddressFragment | undefined>>,
}) {
  if (!addresses || addresses.length === 0) {
    return <div>No addresses found</div>
  }

  return (
    <select onChange={async (event) => {
      const addressId = event.target.value
      const activeAddress = addresses.find(({ address, id }) => id === addressId)
      onAddressChange && onAddressChange(activeAddress)
    }}>
      {addresses.map(({ address, selected, id }) => {
        return (
          <option key={id} defaultChecked={selected} value={id}>
            {address.address1} {selected ? '(selected)' : ''}
          </option>
        )
      })}
    </select >
  )
}
