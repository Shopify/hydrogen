import {
  type AppLoadContext,
  createCookieSessionStorage,
  type SessionStorage,
} from '@hydrogen/remix';

let sessionStorage: SessionStorage;

export async function getSession(request: Request, context: AppLoadContext) {
  if (!context.env?.ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }

  sessionStorage ??= createCookieSessionStorage({
    cookie: {
      name: 'session',
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secrets: [context.env.ENCRYPTION_KEY],
    },
  });

  const session = await sessionStorage.getSession(
    request.headers.get('Cookie'),
  );

  return {
    async get(key: string): Promise<any> {
      return await session.get(key);
    },

    set(key: string, value: any): void {
      session.set(key, value);
    },

    unset(key: string): void {
      session.unset(key);
    },

    flash(key: string, value: any): void {
      session.flash(key, value);
    },

    async commit(): Promise<string> {
      return await sessionStorage.commitSession(session);
    },
  };
}
