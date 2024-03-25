import {CartForm} from '@shopify/hydrogen';

export function LocationSelector({customer}) {
  const company =
    customer?.data?.customer?.companyContacts?.edges?.[0]?.node?.company;

  const locations = company?.locations?.edges
    ? company.locations.edges.map((loc) => {
        return {...loc.node};
      })
    : [];

  function LocationItem({location}) {
    const addressLines = location?.shippingAddress?.formattedAddress ?? [];
    return (
      <label>
        <div style={{display: 'flex', alignItems: 'baseline'}}>
          <input
            type="radio"
            id={location.id}
            name="companyLocationId"
            value={location.id}
            style={{marginRight: '1rem'}}
          />
          <div>
            <strong>{location.name}</strong>
            {addressLines.map((line: string) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </div>
      </label>
    );
  }

  if (!company) return <h2>Not logged in for B2B</h2>;

  return (
    <div>
      <h1>Logged in for {company.name}</h1>
      <CartForm route="/cart" action={CartForm.ACTIONS.BuyerIdentityUpdate}>
        <fieldset>
          <legend>Choose a location:</legend>
          {locations.map((location) => {
            return (
              <div key={location.id}>
                <LocationItem location={location} />
                <br />
                <br />
              </div>
            );
          })}
        </fieldset>
        <button type="submit">Choose Location</button>
      </CartForm>
    </div>
  );
}
