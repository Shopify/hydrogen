---
'skeleton': patch
'@shopify/hydrogen': patch
'@shopify/cli-hydrogen': patch
---

✨ Use the new Customer Account API in the account section of the skeleton template

✨ Add an `authUrl` option to `createCustomerClient` that defines the route in your app that authorizes a user after logging in. The default value is `/account/authorize`.

✨ Add an optional `redirectPath` parameter to customer client's login method. This param defines the final path the user lands on at the end of the oAuth flow. It defaults to `/`
