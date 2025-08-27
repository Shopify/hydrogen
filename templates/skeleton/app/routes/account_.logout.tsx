import {redirect, type ActionFunctionArgs} from 'react-router';

// if we don't implement this, /account/logout will get caught by account.$.tsx to do login
export async function loader() {
  return redirect('/');
}

export async function action({context}: ActionFunctionArgs) {
  return context.customerAccount.logout();
}
