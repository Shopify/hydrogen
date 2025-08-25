# Hydrogen Customer Account API OAuth Reference Guide

**Version:** Remix-based Hydrogen (Working Implementation)  
**Date:** 2025-08-25  
**Purpose:** Complete reference for troubleshooting OAuth authentication issues

---

## Table of Contents

1. [OAuth Flow Overview](#oauth-flow-overview)
2. [Session State Analysis](#session-state-analysis)
3. [Implementation Architecture](#implementation-architecture)
4. [Success Validation Checklist](#success-validation-checklist)
5. [Troubleshooting Framework](#troubleshooting-framework)

---

## OAuth Flow Overview

### 9-Phase Authentication Flow

The complete OAuth flow consists of 9 distinct phases with specific success criteria:

#### Phase 1: Initial Page Load
- **URL:** `https://{domain}/`
- **Expected:** HTTP 200
- **Critical Headers:** CSP with `connect-src` for shopify.com
- **Session State:** Pre-OAuth parameters initialized
- **Success Indicator:** Page loads with login capability

#### Phase 2: OAuth Initiation
- **URL:** `https://shopify.com/authentication/{shop_id}/oauth/authorize`
- **Expected:** HTTP 302 redirect
- **Critical Parameters:**
  - `client_id`: `3eedc4e2-8ccf-4fd0-82bd-9692ee983fdb` (your client ID)
  - `code_challenge`: Base64 URL-safe string (PKCE)
  - `code_challenge_method`: `S256`
  - `state`: CSRF protection token
  - `nonce`: Replay protection token
  - `scope`: `openid+email+customer-account-api:full`
  - `redirect_uri`: Your Hydrogen callback URL

#### Phase 3: Login Page
- **URL:** `https://shopify.com/authentication/{shop_id}/login`
- **Expected:** HTTP 200
- **Success Indicator:** Login form with hCaptcha integration

#### Phase 4: Authentication Callback
- **URL:** `https://shopify.com/authentication/{shop_id}/login/external/shop/callback`
- **Expected:** HTTP 302 with authorization code
- **Critical Parameters:**
  - `code`: Long encrypted string
  - `state`: Must match original state parameter

#### Phase 5: OAuth Authorization
- **URL:** `https://shopify.com/authentication/{shop_id}/oauth/authorize`
- **Expected:** HTTP 302 redirect
- **Critical Parameters:**
  - `shop_id_token`: JWT token from Shopify
  - Previous PKCE and state parameters maintained

#### Phase 6: Hydrogen Callback
- **URL:** `https://{domain}/account/authorize`
- **Expected:** HTTP 302 redirect
- **Critical Parameters:**
  - `code`: Authorization code starting with `shcac_`
  - `shop_id_token`: Same JWT from previous step
  - `state`: Original CSRF token

#### Phase 7: Account Access
- **URL:** `https://{domain}/account`
- **Expected:** HTTP 302 redirect to specific account page

#### Phase 8: Account Redirect
- **URL:** `https://{domain}/account/orders` (or other account page)
- **Expected:** HTTP 200
- **Success Indicator:** Authenticated account page loads

#### Phase 9: Final Success
- **Result:** User authenticated and accessing Customer Account API
- **Verification:** Account data displays properly

---

## Session State Analysis

### Pre-OAuth Session Structure

**Session Cookie (before authentication):**
```json
{
  "customerAccount": {
    "codeVerifier": "CvlMzWPW3kWcP47s2KIKv67ulDmyLcLXyW2oThLywIk",
    "state": "175616309191316fc6yzn8h",
    "nonce": "34bb8e1818206ba3599ac30b0e5c560f",
    "redirectPath": "/account"
  }
}
```

**Critical Pre-Auth Parameters:**
- **Code Verifier:** PKCE verification string (43+ chars Base64URL)
- **State:** CSRF protection token (must survive redirect chain)
- **Nonce:** Replay protection for ID token validation
- **Redirect Path:** Post-authentication navigation target

### Post-Authentication Session Structure

**Session Cookie (after successful authentication):**
```json
{
  "customerAccount": {
    "accessToken": "shcat_eyJraWQiOiIwIiwiYWxnIjoiRUQyNTUxOSJ9...",
    "expiresAt": "1756165714120",
    "refreshToken": "shcrt_3a36ec2533d81cca651fb6bdc9e97dad",
    "idToken": "eyJraWQiOiJpZF8wIiwiYWxnIjoiUlMyNTYifQ..."
  }
}
```

**Authentication Tokens:**
- **Access Token:** `shcat_` prefixed JWT for Customer Account API calls
- **Refresh Token:** `shcrt_` prefixed token for token renewal
- **ID Token:** Standard JWT with customer identity information
- **Expires At:** Unix timestamp for token expiration

### Session State Progression

```
PRE-OAUTH STATE                    POST-AUTH STATE
├── codeVerifier (PKCE)        →   ├── accessToken (API auth)
├── state (CSRF)               →   ├── refreshToken (renewal)
├── nonce (replay protection)  →   ├── idToken (identity)
└── redirectPath (navigation)  →   └── expiresAt (lifecycle)
```

---

## Implementation Architecture

### Session Infrastructure

**File:** `app/lib/session.ts`

```typescript
export class AppSession implements HydrogenSession {
  static async init(request: Request, secrets: string[]) {
    const storage = createCookieSessionStorage({
      cookie: {
        name: 'session',           // Cookie name
        httpOnly: true,            // Security: no JS access
        path: '/',                 // Available site-wide
        sameSite: 'lax',          // CSRF protection
        secrets,                   // Signing/encryption
      },
    });

    const session = await storage
      .getSession(request.headers.get('Cookie'))
      .catch(() => storage.getSession());

    return new this(storage, session);
  }
}
```

**Key Configuration:**
- **Cookie Name:** `session` (matches captured data)
- **Security:** HttpOnly prevents XSS attacks
- **SameSite:** `lax` prevents CSRF attacks
- **Secrets:** Uses SESSION_SECRET environment variable for signing

### Server Integration

**File:** `server.ts`

```typescript
export default {
  async fetch(request: Request, env: Env, executionContext: ExecutionContext) {
    const appLoadContext = await createAppLoadContext(request, env, executionContext);
    const handleRequest = createRequestHandler({
      build: remixBuild,
      mode: process.env.NODE_ENV,
      getLoadContext: () => appLoadContext,
    });

    const response = await handleRequest(request);

    // Automatic session commit
    if (appLoadContext.session.isPending) {
      response.headers.set(
        'Set-Cookie',
        await appLoadContext.session.commit(),
      );
    }

    return response;
  },
};
```

**Session Management:**
- **Automatic Commit:** Server automatically commits pending sessions
- **Set-Cookie Headers:** Session data sent via response headers
- **Context Integration:** Session injected into all route handlers

### Context Integration

**File:** `app/lib/context.ts`

```typescript
export async function createAppLoadContext(request: Request, env: Env, executionContext: ExecutionContext) {
  if (!env?.SESSION_SECRET) {
    throw new Error('SESSION_SECRET environment variable is not set');
  }

  const session = await AppSession.init(request, [env.SESSION_SECRET]);

  const hydrogenContext = createHydrogenContext({
    env, request, cache, waitUntil,
    session,  // Session injected into context
    i18n: {language: 'EN', country: 'US'},
    cart: { queryFragment: CART_QUERY_FRAGMENT },
  });

  return { ...hydrogenContext };
}
```

**Context Architecture:**
- **Session Integration:** AppSession injected into Hydrogen context
- **Customer Account API:** Automatically configured via createHydrogenContext
- **Environment Validation:** SESSION_SECRET required

### OAuth Route Handlers

**Login Route:** `app/routes/account_.login.tsx`
```typescript
export async function loader({request, context}: LoaderFunctionArgs) {
  return context.customerAccount.login();
}
```

**Authorize Route:** `app/routes/account_.authorize.tsx`
```typescript
export async function loader({context}: LoaderFunctionArgs) {
  return context.customerAccount.authorize();
}
```

**Logout Route:** `app/routes/account_.logout.tsx`
```typescript
export async function action({context}: ActionFunctionArgs) {
  return context.customerAccount.logout();
}
```

**Authentication Guard:** `app/routes/account.$.tsx`
```typescript
export async function loader({context}: LoaderFunctionArgs) {
  await context.customerAccount.handleAuthStatus();
  return redirect('/account');
}
```

**Key Implementation Points:**
- **Minimal Route Logic:** All OAuth complexity handled by Hydrogen framework
- **Context Delegation:** Routes use `context.customerAccount.*` methods exclusively
- **Framework Abstraction:** No manual session management required

---

## Success Validation Checklist

### Environment Setup
- [ ] Hydrogen site accessible with tunnel domain
- [ ] Customer Account API enabled in Shopify Partner Dashboard
- [ ] OAuth client properly configured with correct redirect URI
- [ ] CSP headers allow connections to shopify.com
- [ ] SESSION_SECRET environment variable configured

### HTTP Flow Validation
- [ ] All HTTP responses are 200 or 302 (no 4xx/5xx errors)
- [ ] Phase 1: Initial page load returns 200 with proper CSP
- [ ] Phase 2-6: Redirect chain maintains 302 status codes
- [ ] Phase 7-9: Final account pages load with 200 status

### OAuth Parameter Validation
- [ ] PKCE parameters (code_challenge, state, nonce) present throughout flow
- [ ] Authorization code follows `shcac_` prefix pattern
- [ ] Shop ID token passed between Shopify endpoints
- [ ] `client_id` matches registered OAuth application
- [ ] `redirect_uri` exactly matches registered callback URL
- [ ] `scope` includes `customer-account-api:full`
- [ ] `code_challenge_method` is `S256`

### Session State Validation
- [ ] Pre-auth session contains: codeVerifier, state, nonce, redirectPath
- [ ] Post-auth session contains: accessToken, refreshToken, idToken, expiresAt
- [ ] Session cookie is properly signed with session secret
- [ ] Access token follows `shcat_` format with valid JWT structure
- [ ] Refresh token follows `shcrt_` format
- [ ] ID token is valid JWT with customer information
- [ ] Session expires timestamp is future date

### Framework Integration Validation
- [ ] AppSession implements HydrogenSession interface
- [ ] createHydrogenContext includes session in configuration
- [ ] OAuth routes delegate to context.customerAccount methods
- [ ] Server automatically commits pending sessions
- [ ] Authentication guard catches unauthenticated access

---

## Troubleshooting Framework

### Common Failure Points by Phase

**Phase 1 Failures:**
- **Symptoms:** 4xx/5xx on initial load, missing CSP headers
- **Check:** Server configuration, environment variables, CSP settings

**Phase 2 Failures:**
- **Symptoms:** Missing PKCE parameters, invalid client_id
- **Check:** OAuth client configuration, session initialization

**Phase 3 Failures:**
- **Symptoms:** Authentication provider unavailable
- **Check:** Shopify service status, network connectivity

**Phase 4-5 Failures:**
- **Symptoms:** Invalid authorization code, state mismatch
- **Check:** Session persistence, CSRF token validation

**Phase 6-7 Failures:**
- **Symptoms:** Callback processing errors, token validation failures
- **Check:** Route handler implementation, context integration

**Phase 8-9 Failures:**
- **Symptoms:** Account API access denied, missing permissions
- **Check:** Token format, API scopes, customer account status

### Session Debugging Commands

**Check Session Cookie (Browser Console):**
```javascript
// View current session cookie
document.cookie.split(';').find(c => c.trim().startsWith('session='))

// Decode session content (if Base64)
atob(sessionValue.split('.')[0])
```

**Server-side Session Debugging:**
```typescript
// In route handler
console.log('Session data:', context.session.get('customerAccount'));
console.log('Session pending:', context.session.isPending);
```

### Environment Variable Checklist

```bash
# Required environment variables
SESSION_SECRET=your-secret-key-here
PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID=3eedc4e2-8ccf-4fd0-82bd-9692ee983fdb
PUBLIC_CUSTOMER_ACCOUNT_API_URL=https://shopify.com
PUBLIC_STOREFRONT_API_TOKEN=your-storefront-token
```

### TypeScript Interfaces for Validation

```typescript
// Pre-authentication session structure
interface PreAuthSession {
  codeVerifier: string;    // 43+ char Base64URL string
  state: string;           // Unique CSRF token
  nonce: string;           // Unique replay protection
  redirectPath: string;    // Target navigation path
}

// Post-authentication session structure
interface AuthenticatedSession {
  accessToken: string;     // shcat_ prefixed JWT
  refreshToken: string;    // shcrt_ prefixed token
  idToken: string;         // Standard JWT with claims
  expiresAt: string;       // Unix timestamp string
}

// Session validation helper
function validateSession(session: any): boolean {
  if (session.customerAccount?.accessToken) {
    // Authenticated state
    return session.customerAccount.accessToken.startsWith('shcat_') &&
           session.customerAccount.refreshToken.startsWith('shcrt_') &&
           session.customerAccount.idToken.length > 0 &&
           parseInt(session.customerAccount.expiresAt) > Date.now();
  } else if (session.customerAccount?.codeVerifier) {
    // Pre-auth state
    return session.customerAccount.codeVerifier.length >= 43 &&
           session.customerAccount.state.length > 0 &&
           session.customerAccount.nonce.length > 0;
  }
  return false;
}
```

---

## Conclusion

This reference guide documents a fully working Hydrogen Customer Account API OAuth implementation using the Remix framework. The key success factors are:

1. **Proper session configuration** with security settings and secret management
2. **Framework integration** through Hydrogen's createHydrogenContext
3. **Minimal route handlers** that delegate to context.customerAccount methods
4. **Automatic session management** with server-side commit handling
5. **Complete OAuth parameter flow** with PKCE, state, and nonce validation

Use this reference to compare against broken implementations and identify where the authentication flow deviates from the expected behavior.

---

**Generated:** 2025-08-25  
**Based on:** Production HAR file analysis and working Remix implementation  
**For:** Hydrogen Customer Account API troubleshooting