# Hydrogen Customer API Example

This is an example using the new Shopify [Customer Accounts API](https://shopify.dev/docs/api/customer). Note this functionality is in dev preview, the API is subject to change, and should not be used in production.

## Requirements

1. Hydrogen 2023.7 or later
2. [Ngrok](https://ngrok.com/) for pointing a public https domain to your local machine

## Setup

1. Add the Customer API to your Hydrogen channel within the Shopify admin
1. Setup an ngrok account and add a permanent domain.
1. Copy the permanent domain from ngrok and add a callback URI: `https://your-ngrok-domain.app/authorize`
1. Add a JavaScript origin with your ngrok domain: `https://your-ngrok-domain.app`
1. Add a logout URI to your ngrok domain: `https://your-ngrok-domain.app`
1. Copy `.env.example` to `.env` and replace the credentials with those from your Hydrogen channel.
1. Update the `ngrok` script within `package.json` to use your ngrok domain
1. In a terminal start ngrok with `npm run ngrok`
1. In another terminal, start hydrogen with `npm run dev`
