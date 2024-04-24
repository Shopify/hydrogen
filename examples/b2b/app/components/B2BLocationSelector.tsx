import {CartForm} from '@shopify/hydrogen';
import type {
  CustomerCompany,
  CustomerCompanyLocation,
  CustomerCompanyLocationConnection,
} from '~/root';

export function B2BLocationSelector({company}: {company: CustomerCompany}) {
  const locations = company?.locations?.edges
    ? company.locations.edges.map(
        (location: CustomerCompanyLocationConnection) => {
          return {...location.node};
        },
      )
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

  if (!company) return null;

  return (
    <div className="modal">
      <div className="modal-content">
        <h2>Logged in for {company.name}</h2>
        <CartForm route="/cart" action={CartForm.ACTIONS.BuyerIdentityUpdate}>
          <fieldset>
            <legend>Choose a location:</legend>
            {locations.map((location: CustomerCompanyLocation) => {
              return (
                <div key={location.id}>
                  <LocationItem location={location} />
                  <br />
                </div>
              );
            })}
          </fieldset>
          <button type="submit">Choose Location</button>
        </CartForm>
      </div>
    </div>
  );
}
