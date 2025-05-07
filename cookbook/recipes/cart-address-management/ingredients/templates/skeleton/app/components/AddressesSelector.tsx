import type {CartAddressFragment} from 'storefrontapi.generated';

/**
 * A dropdown component for selecting shipping/billing addresses.
 *
 * @param addresses - Array of available addresses to select from
 * @param selectedAddress - Currently selected address (can be null)
 * @param onAddressChange - Optional callback function triggered when address selection changes
 * @returns A select dropdown populated with address options or a message if no addresses exist
 */
export function AddressesSelector({
  addresses,
  selectedAddress,
  onAddressChange,
}: {
  addresses: Array<CartAddressFragment>;
  selectedAddress: CartAddressFragment | null;
  onAddressChange?: React.Dispatch<
    React.SetStateAction<CartAddressFragment | undefined>
  >;
}) {
  if (!addresses || addresses.length === 0) {
    return <div>No addresses found</div>;
  }

  function onChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const addressId = event.target.value;
    const activeAddress = addresses.find(({id}) => id === addressId);
    onAddressChange?.(activeAddress || selectedAddress || addresses[0]);
  }

  return (
    <select onChange={onChange}>
      {addresses.map(({address, selected, id}) => {
        return (
          <option key={id} defaultChecked={selected} value={id}>
            {address.address1} {selected ? '(selected)' : ''}
          </option>
        );
      })}
    </select>
  );
}
