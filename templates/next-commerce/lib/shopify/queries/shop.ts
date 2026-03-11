export const getShopAnalyticsQuery = /* GraphQL */ `
  query getShopAnalytics {
    shop {
      id
    }
    localization {
      country {
        currency {
          isoCode
        }
      }
      language {
        isoCode
      }
    }
  }
`;
