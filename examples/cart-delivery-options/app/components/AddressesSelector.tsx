import type { CartAddressFragment } from 'storefrontapi.generated';

export function AddressesSelector({ addresses, selectedAddress, onAddressChange }: {
  addresses: Array<CartAddressFragment>, selectedAddress: CartAddressFragment | undefined, onAddressChange?: React.Dispatch<React.SetStateAction<CartAddressFragment | undefined>>,
}) {
  if (!addresses || addresses.length === 0) {
    return <div>No addresses found</div>
  }

  return (
    <select onChange={(event) => {
      // TODO: should I update this address as selected when the user selects it in the select?
      const activeAddress = addresses.find(({ address }) => address.address1 === event.target.value)
      onAddressChange && onAddressChange(activeAddress)
    }}>
      {addresses.map(({ address, selected }) => {
        const title = address.formatted.slice(0, 2).toString()
        return (
          <option key={address.formatted.toString()} value={title} defaultChecked={selected}>
            {address.address1} {selected ? '(selected)' : ''}
          </option>
        )
      })}
    </select >
  )
}
