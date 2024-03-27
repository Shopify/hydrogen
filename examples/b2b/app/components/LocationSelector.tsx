import {Form, useNavigate} from '@remix-run/react';
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
      <Form id={'company-location-selector'}>
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
          <button formAction="/locations" formMethod="POST" type="submit">
            Choose Location
          </button>
        </fieldset>
      </Form>
    </div>
  );
}
