# Hydrogen Customer API Example

**Caution: The Customer API and this example are both in an unstable pre-release state and may have breaking changes in a future release.**

This is an example using the new Shopify [Customer Accounts API](https://shopify.dev/docs/api/customer). Note this functionality is in dev preview, the API is subject to change, and should not be used in production.

## Requirements

1. Hydrogen 2023.7 or later
2. [Ngrok](https://ngrok.com/) for pointing a public https domain to your local machine required for oAuth

## Environment variables

Create a `.env` file at the root of your project

```toml
PUBLIC_CUSTOMER_ACCOUNT_ID=shp_<your-id>
PUBLIC_CUSTOMER_ACCOUNT_URL=https://shopify.com/<your-url-id>
PUBLIC_STOREFRONT_API_TOKEN=<your-storefront-api-token>
PUBLIC_STORE_DOMAIN=<your-store>.myshopify.com
SESSION_SECRET=foobar
```

## Setup

1. Setup a [ngrok](https://ngrok.com/) account and add a permanent domain.
2. Add the `Hydrogen` or `Headless` app/channel to your store via the Shopify admin
3. Create a storefront if one doesn't exist
4. Access the `Customer Account API` settings via the storefront settings page
5. Copy the permanent domain from ngrok and add it as a `callback URI`: `https://your-ngrok-domain.app/authorize`
6. Add a `JavaScript origin` with your ngrok domain: `https://your-ngrok-domain.app`
7. Add a logout URI to your ngrok domain: `https://your-ngrok-domain.app`
8. Copy the `Client ID` from the Customer Account API credentials to the `.env` `PUBLIC_CUSTOMER_ACCOUNT_ID` variable
9. Copy the Customer Account API url to the `.env` `PUBLIC_CUSTOMER_ACCOUNT_URL` variable
10. Update the ngrok npm script within `package.json` to use your ngrok domain
11. Install the [ngrok CLI](https://ngrok.com/download)
12. In a terminal start ngrok with `npm run ngrok`
13. In another terminal, start hydrogen with `npm run dev`
