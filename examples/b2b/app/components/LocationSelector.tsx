import {useNavigate} from '@remix-run/react';
import {useState} from 'react';

export function LocationSelector({customer}) {
  const company =
    customer?.data?.customer?.companyContacts?.edges?.[0]?.node?.company;

  const locations = company?.locations?.edges
    ? company.locations.edges.map((loc) => {
        return {...loc.node};
      })
    : [];

  const [selectedLocation, setSelectedLocation] = useState();
  const navigate = useNavigate();

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
    navigate('/', {replace: true});
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
    </div>
  );
}
