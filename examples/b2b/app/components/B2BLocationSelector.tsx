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

  if (!company) return null;

  return (
    <div className="modal">
      <div className="modal-content">
        <h2>Logged in for {company.name}</h2>
        <legend>Choose a location:</legend>
        <div className="location-list">
          {locations.map((location: CustomerCompanyLocation) => {
            const addressLines =
              location?.shippingAddress?.formattedAddress ?? [];
            return (
              <CartForm
                key={location.id}
                route="/cart"
                action={CartForm.ACTIONS.BuyerIdentityUpdate}
              >
                {(fetcher) => (
                  <label>
                    <button
                      onClick={(event) => {
                        fetcher.submit(event.currentTarget.form, {
                          method: 'POST',
                        });
                      }}
                      className="location-item"
                    >
                      <input
                        style={{display: 'none'}}
                        type="text"
                        id={location.id}
                        name="companyLocationId"
                        readOnly
                        value={location.id}
                      />
                      <div>
                        <p>
                          <strong>{location.name}</strong>
                        </p>
                        {addressLines.map((line: string) => (
                          <p key={line}>{line}</p>
                        ))}
                      </div>
                    </button>
                  </label>
                )}
              </CartForm>
            );
          })}
        </div>
      </div>
    </div>
  );
}
