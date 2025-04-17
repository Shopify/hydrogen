import type { DeliveryGroupFragment } from 'storefrontapi.generated'

export function Address({ address }: { address: DeliveryGroupFragment['deliveryAddress'] }) {
  if (!address) {
    return <div>Address not provided</div>
  }
  return (
    <div>
      <div>{address.firstName} {address.lastName}</div>
      <div>{address.address1}</div>
      {address.address2 && <div>{address.address2}</div>}
      <div>{address.city}, {address.provinceCode} {address.zip}</div>
      <div>{address.country}</div>
      <div>{address.phone}</div>
    </div>
  )
}
