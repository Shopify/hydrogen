// NOTE: https://shopify.dev/docs/api/customer/latest/objects/Customer
// @description Customer query to fetch company locations
export const CUSTOMER_LOCATIONS_QUERY = `#graphql
  query CustomerLocations {
    customer {
      id
      emailAddress {
        emailAddress
      }
      companyContacts(first: 1){
        edges{
          node{
            company{
              id
              name
              locations(first: 10){
                edges{
                  node{
                    id
                    name
                    shippingAddress {
                      countryCode
                      formattedAddress
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
` as const;
