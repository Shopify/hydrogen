import {useState} from 'react';
import {
  Form,
  useActionData,
  useNavigation,
  useOutletContext,
  type MetaFunction,
} from '@remix-run/react';

export function LocationSelector({customer, companyLocationId}) {
  const company =
    customer?.customer?.companyContacts?.edges?.[0]?.node?.company;

  const locations = company?.locations?.edges
    ? company.locations.edges.map((loc) => {
        return {...loc.node};
      })
    : [];

  const [selectedLocation, setSelectedLocation] = useState(
    locations.find((loc) => loc.id === companyLocationId) || null,
  );
  const [savedLocation, setSavedLocation] = useState(
    locations.find((loc) => loc.id === companyLocationId) || null,
  );

  const setLocation = async () => {
    const locationId = selectedLocation?.id;
    const locationCountry = selectedLocation?.shippingAddress?.countryCode;
    await fetch(`/locations`, {
      method: 'POST',
      body: JSON.stringify({
        locationId,
        country: locationCountry,
      }),
    });
    setSavedLocation(location);
  };

  function LocationItem({location}) {
    const addressLines = location?.shippingAddress?.formattedAddress ?? [];
    return (
      <>
        <fieldset
          style={{
            cursor: 'pointer',
            background:
              selectedLocation?.id === location.id ? '#F0F0F0' : 'none',
          }}
          onClick={() => setSelectedLocation(location)}
        >
          <p>
            <strong>{location.name}</strong>
          </p>
          {addressLines.map((line: string) => (
            <p key={line}>{line}</p>
          ))}
        </fieldset>
        <br />
      </>
    );
  }

  if (!company) return <h2>Not logged in for B2B</h2>;

  return (
    <div>
      <h1>Logged in for {company.name}</h1>
      {savedLocation ? (
        <div>
          <h3>
            Selected Location{' '}
            {savedLocation ? savedLocation.name : locations[0].name}
          </h3>
          <button
            className="location-select-cta"
            onClick={() => {
              setSavedLoction(null);
              setSelectedLocation(null);
            }}
          >
            <p>Select different location</p>
          </button>
        </div>
      ) : (
        <div>
          {locations.map((location) => {
            return (
              <div key={location.id}>
                <LocationItem location={location} />
              </div>
            );
          })}
          <button onClick={setLocation}>Choose location</button>
        </div>
      )}
    </div>
  );
}
