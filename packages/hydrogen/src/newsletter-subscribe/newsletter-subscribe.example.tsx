import {UNSTABLE_NewsletterSubscribeForm as NewsletterSubscribeForm} from '@shopify/hydrogen';

// place <NewsletterSignUp /> anywhere you want the subscription form to show up
export function NewsletterSignUp({placeholder = 'Email'}) {
  return (
    <NewsletterSubscribeForm>
      {(fetcher, isSuccessful, error) => {
        return (
          <>
            <p>Subscribe to our emails</p>
            <input
              type="email"
              name="email"
              aria-required="true"
              autoCorrect="off"
              autoCapitalize="off"
              autoComplete="email"
              placeholder="Email"
              required
            />
            {isSuccessful ? (
              <span>✅</span>
            ) : (
              <button type="submit" disabled={fetcher.state !== 'idle'}>
                Sign Up
              </button>
            )}
            {error ? (
              <p>
                <em>{error}</em>
              </p>
            ) : null}
          </>
        );
      }}
    </NewsletterSubscribeForm>
  );
}

// in app/routes/api.newsletter-subscribe.tsx by default
import {json, type ActionFunctionArgs} from '@shopify/remix-oxygen';
import {UNSTABLE_newsletterSubscribeHandler as newsletterSubscribeHandler} from '@shopify/hydrogen';

export async function action({request, context}: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = formData.has('email') ? String(formData.get('email')) : null;

  const response = await newsletterSubscribeHandler(context.storefront, email);

  return json(response);
}
