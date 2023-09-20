Client-side Enviroment variables

A common requirement of headless aplications is to utilize environment variables to
control the behavior and configuration of certain components. This is particularly true
when integrating 3P services and applications.

Currently, Hydrogen does not offer an easy solution to share env variables
throughout the application. By default Remix encourages passing environment variables
from the server context to the client using a loader property that can later be accessed
via `useLoaderData` or `useMatches`. This approach is not only ergonomically verbose,
but also prone to errors and potentially unsafe opening the door for application
secrets to be exposed to the browser.

The proposed solution introduces two utilities to help reduce the required boilerplate
while ensuring that only client-safe variables are shared to the browser.

`getPublicEnv.server`

This simple utility receives all the env variables in `context.env`
and returns only the variables prefixed with `PUBLIC_`. This utility should be
called and it's value returned by the root.tsx loader to ensure it is later
accessible by the `useEnv` utility.

`useEnv`

A simple hook can be used to througout the application to easily access any public
environment variable.

### Example implementation (skeleton)

```ts
// root.tsx

import {getPublicEnv} from '@shopify/hydrogen';

export async function loader({context}) {
  const publicEnv = getPublicEnv(context.env);
  // ...other code
  return {
    publicEnv, // exposed publicEnv to the browser
    // ...other code
  };
}

// ShopifyChatInbox.tsx
export function ShopifyChatInbox() {
  // Access public environment variables
  const env = useEnv();

  return (
    <ShopifyInbox
      shop={{
        domain: env.PUBLIC_STORE_DOMAIN,
        token: env.PUBLIC_INBOX_CHAT_TOKEN,
      }}
      button={{
        color: 'red',
        style: 'icon',
        horizontalPosition: 'button_right',
        verticalPosition: 'lowest',
        text: 'chat_with_us',
        icon: 'chat_bubble',
      }}
    />
  );
}
```
