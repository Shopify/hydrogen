# Hydrogen Customer Account API Example

**Caution: The Customer API and this example are both in an unstable pre-release state and may have breaking changes in a future release.**

This is an example using the new Shopify [Customer Account API](https://shopify.dev/docs/api/customer)

## Requirements

1. Hydrogen 2023.7 or later
1. A `Hydrogen` or `Headless` app/channel installed to your store and a storefront created
1. [Ngrok](https://ngrok.com/) for pointing a public https domain to your local machine required for oAuth

## Setup

### Setup public domain using ngrok

1. Setup a [ngrok](https://ngrok.com/) account and add a permanent domain (ie. `https://<your-ngrok-domain>.app`).
1. Install the [ngrok CLI](https://ngrok.com/download) to use in terminal
1. Start ngrok using `npm run ngrok --domain=<your-ngrok-domain>.app`

### Include public domain in Customer Account API settings

1. Go to your Shopify admin => `Hydrogen` or `Headless` app/channel => Customer Account API => Application setup
1. Edit `Callback URI(s)` to include `https://<your-ngrok-domain>.app/authorize`
1. Edit `Javascript origin(s)` to include your public domain `https://<your-ngrok-domain>.app` or keep it blank
1. Edit `Logout URI` to include your public domain `https://<your-ngrok-domain>.app` or keep it blank

### Prepare Environment variables

To preview this example with mock data, copy `example.env` and rename it to `.env` in the root of your project.

Alternatly, run [`npx shopify hydrogen link`](https://shopify.dev/docs/custom-storefronts/hydrogen/cli#link) or [`npx shopify hydrogen env pull`](https://shopify.dev/docs/custom-storefronts/hydrogen/cli#env-pull) to link this example to your own test shop

### Start example

1. In a seperate terminal, start hydrogen with `npm run dev`
1. Goto `https://<your-ngrok-domain>.app` to start the login process
