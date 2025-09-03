import {CartForm} from '@shopify/hydrogen';
import type {
  CustomerCompanyLocation,
  CustomerCompanyLocationConnection,
} from '~/root';
import {useB2BLocation} from '~/components/B2BLocationProvider';

export function B2BLocationSelector() {
  const {company, modalOpen, setModalOpen} = useB2BLocation();

  const locations = company?.locations?.edges
    ? company.locations.edges.map(
        (location: CustomerCompanyLocationConnection) => {
          return {...location.node};
        },
      )
    : [];

  if (!company || !modalOpen)
    return <p>No company found for logged in user.</p>;

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
                inputs={{
                  buyerIdentity: {companyLocationId: location.id},
                }}
              >
                {(fetcher) => (
                  <div>
                    <button
                      aria-label={`Select location ${location.name}`}
                      onClick={(event) => {
                        setModalOpen(false);
                        fetcher.submit(event.currentTarget.form, {
                          method: 'POST',
                        });
                      }}
                      className="location-item"
                    >
                      <div>
                        <p>
                          <strong>{location.name}</strong>
                        </p>
                        {addressLines.map((line: string) => (
                          <p key={line}>{line}</p>
                        ))}
                      </div>
                    </button>
                  </div>
                )}
              </CartForm>
            );
          })}
        </div>
      </div>
    </div>
  );
}
