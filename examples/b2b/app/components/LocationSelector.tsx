import {CartForm} from '@shopify/hydrogen';
import type {
  CustomerCompany,
  CustomerCompanyLocation,
  CustomerCompanyLocationConnection,
} from '~/root';

export function LocationSelector({company}: {company: CustomerCompany}) {
  const locations = company?.locations?.edges
    ? company.locations.edges.map((location: CustomerCompanyLocationConnection) => {
        return {...location.node};
      })
    : [];

  function LocationItem({location}: {location: CustomerCompanyLocation}) {
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
          {locations.map((location: CustomerCompanyLocation) => {
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
