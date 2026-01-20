---
'@shopify/cli-hydrogen': patch
'@shopify/create-hydrogen': patch
'skeleton': patch
---

Support OAuth parameters via URL query strings in skeleton login route

The skeleton template's login route (`account_.login.tsx`) now reads OAuth parameters from the URL and forwards them to `customerAccount.login()`. This enables deep linking to the login page with pre-configured authentication options.

### Supported Query Parameters

| Query Parameter | Description |
|-----------------|-------------|
| `acr_values` | Direct users to a specific login method (e.g., `provider:google` for social login) |
| `login_hint` | Pre-fill the email address field |
| `login_hint_mode` | When set to `submit` with `login_hint`, auto-submits the login form |
| `locale` | Display the login page in a specific language (e.g., `fr`, `zh-CN`) |

### Usage Examples

```
/account/login?login_hint=user@example.com
/account/login?login_hint=user@example.com&login_hint_mode=submit
/account/login?acr_values=provider:google
/account/login?locale=fr
```
