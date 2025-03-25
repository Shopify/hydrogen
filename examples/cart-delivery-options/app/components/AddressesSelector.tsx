import type { CartAddressFragment } from 'storefrontapi.generated';

export function AddressesSelector({ addresses, selectedAddress, onAddressChange }: {
  addresses: Array<CartAddressFragment>, selectedAddress: CartAddressFragment | null, onAddressChange?: React.Dispatch<React.SetStateAction<CartAddressFragment | undefined>>,
}) {
  if (!addresses || addresses.length === 0) {
    return <div>No addresses found</div>
  }

  function onChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const addressId = event.target.value
    const activeAddress = addresses.find(({ address, id }) => id === addressId)
    onAddressChange && onAddressChange(activeAddress)
  }

  return (
    <select onChange={onChange}>
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
