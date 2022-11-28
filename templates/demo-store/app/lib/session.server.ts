import type {CustomerAccessToken} from '@shopify/hydrogen-react/storefront-api-types';
import {
  createCookieSessionStorage,
  type SessionStorage,
  type Session,
} from '@shopify/hydrogen-remix';

interface GetNotAuthType {
  isAuthenticated: false;
  customerAccessToken: null;
}

interface GetAuthType {
  isAuthenticated: true;
  customerAccessToken: CustomerAccessToken;
}

type GetAuthReturnType = GetNotAuthType | GetAuthType;

/**
 * This is a custom session implementation for your Hydrogen shop.
 * Feel free to customize it to your needs, add helper methods, or
 * swap out the cookie-based implementation with something else!
 */
export class HydrogenSession {
  constructor(
    private sessionStorage: SessionStorage,
    private session: Session,
  ) {}

  static async init(request: Request, secrets: string[]) {
    const storage = createCookieSessionStorage({
      cookie: {
        name: 'session',
        httpOnly: true,
        path: '/',
        sameSite: 'lax',
        secrets,
      },
    });

    const session = await storage.getSession(request.headers.get('Cookie'));

    return new this(storage, session);
  }

  get(key: string) {
    return this.session.get(key);
  }

  destroy() {
    return this.sessionStorage.destroySession(this.session);
  }

  flash(key: string, value: any) {
    this.session.flash(key, value);
  }

  unset(key: string) {
    this.session.unset(key);
  }

  set(key: string, value: any) {
    this.session.set(key, value);
  }

  commit() {
    return this.sessionStorage.commitSession(this.session);
  }

  resetCustomerAccessToken() {
    this.session.unset('customerAccessToken');
  }

  async getEvent() {
    const rawEvent = await this.session.get('event');
    let event = null;
    try {
      event = rawEvent ? JSON.parse(rawEvent) : null;
    } catch (_) {
      this.session.unset(event);
    }

    return event;
  }

  async getAuth(): Promise<GetAuthReturnType> {
    const rawCustomerAccessToken = await this.session.get(
      'customerAccessToken',
    );

    try {
      const customerAccessToken: CustomerAccessToken | null =
        rawCustomerAccessToken ? JSON.parse(rawCustomerAccessToken) : null;

      if (!customerAccessToken) {
        return {
          isAuthenticated: false,
          customerAccessToken: null,
        };
      }

      const {accessToken, expiresAt} = customerAccessToken;
      const tenDays = 3600 * 1000 * 24 * 10;
      const TenDaysAgo = new Date(Date.now() - tenDays);
      const expiryDate = new Date(expiresAt);

      const accessTokenExpired = TenDaysAgo > expiryDate;

      const isAuthenticated = accessToken && !accessTokenExpired;
      return {
        isAuthenticated,
        customerAccessToken,
      };
    } catch (_) {
      // invalid customerAccessToken in session, reset it
      this.resetCustomerAccessToken();
      return {
        isAuthenticated: false,
        customerAccessToken: null,
      };
    }
  }
}
