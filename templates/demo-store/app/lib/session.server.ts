import {
  type AppLoadContext,
  createCookieSessionStorage,
  type SessionStorage,
} from '@shopify/hydrogen-remix';

let sessionStorage: SessionStorage;

export async function getSession(request: Request, secrets: string[]) {
  sessionStorage ??= createCookieSessionStorage({
    cookie: {
      name: 'session',
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secrets,
    },
  });

  const session = await sessionStorage.getSession(
    request.headers.get('Cookie'),
  );

  return {session, sessionStorage};
}
