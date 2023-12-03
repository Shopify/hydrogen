import type {
  MultipassResponse,
  MultipassOptions,
  MultipassTokenResponseType,
} from './types';

/*
  A utility that makes a POST request to the local `/account/login/multipass` endpoint
  to retrieve a multipass `url` and `token` for a given url/customer combination.

  Usage example:
  - Checkout button `onClick` handler.
  - Login button `onClick` handler. (with email required at minimum)
  - Social login buttons `onClick` handler.
*/
export async function multipass(
  options: MultipassOptions,
): Promise<void | MultipassResponse> {
  const {redirect, return_to} = options;

  try {
    // Generate multipass token POST `/account/login/multipass`
    const response = await fetch('/account/login/multipass', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({return_to}),
    });

    if (!response.ok) {
      const message = `${response.status} /multipass response not ok. ${response.statusText}`;
      throw new Error(message);
    }

    // Extract multipass token and url
    const {data, error} = (await response.json()) as MultipassTokenResponseType;

    if (error) {
      throw new Error(error);
    }

    if (!data?.url) {
      throw new Error('Missing multipass url');
    }

    // return the url and token
    if (!redirect) {
      return data;
    }

    // redirect to the multipass url
    window.location.href = data.url;
    return data;
  } catch (error) {
    //@ts-ignore
    console.log('⚠️ Bypassing multipass checkout due to', error.message);

    const message = error instanceof Error ? error.message : 'Unknown error';
    if (!redirect) {
      return {
        url: null,
        token: null,
        error: message,
      };
    }

    if (return_to) {
      window.location.href = return_to;
    }

    return {url: null, token: null, error: message};
  }
}
