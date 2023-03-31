import {redirect, type ActionFunction} from '@shopify/remix-oxygen';

export const action: ActionFunction = async ({context}) => {
  const {customer} = context;

  const {headers} = await customer.logout();

  return redirect('/', {headers});
};

export async function loader() {
  return redirect('/');
}

export default function Logout() {
  return null;
}
