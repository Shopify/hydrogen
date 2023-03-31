import cookie from 'js-cookie';
import {Button} from './Button';

// TODO: get from .env
const identityHost =
  'customer-identity.identity.custom-storefronts-s6z7.mathieu-lagace.us.spin.dev';

export function LogoutButton() {
  if (typeof window === 'undefined') {
    return null;
  }

  const idToken = cookie.get('idToken');

  if (!idToken) {
    return null;
  }

  const logout = async () => {
    const logoutUrl = `https://${identityHost}/logout?id_token_hint=${idToken}`;

    cookie.remove('accessToken');
    cookie.remove('refreshToken');
    cookie.remove('idToken');

    window.location.href = logoutUrl;
  };

  return <Button onClick={logout}>Logout from Identity</Button>;
}
