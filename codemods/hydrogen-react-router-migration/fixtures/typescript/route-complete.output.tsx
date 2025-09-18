import {json, redirect} from '@shopify/hydrogen/oxygen';
import {Form, useLoaderData} from 'react-router';
import {getCustomer} from '~/lib/customer';
import type {Route} from './+types/account.orders.$id';

export const meta: Route.MetaFunction = ({data}) => {
  return [
    {title: `Order ${data?.order?.name ?? ''}`},
    {description: 'Order details'},
  ];
};

export async function loader({context, params}: Route.LoaderArgs) {
  const customerAccessToken = await context.session.get('customerAccessToken');
  
  if (!customerAccessToken) {
    return redirect('/account/login');
  }
  
  const {order} = await context.storefront.query(ORDER_QUERY, {
    variables: {id: params.id},
  });
  
  if (!order) {
    throw new Response('Order not found', {status: 404});
  }
  
  return json({order});
}

export async function action({request, context}: Route.ActionArgs) {
  const formData = await request.formData();
  const action = formData.get('action');
  
  if (action === 'cancel') {
    // Cancel order logic
    return json({success: true});
  }
  
  return json({error: 'Invalid action'}, {status: 400});
}

export default function Order() {
  const {order} = useLoaderData<typeof loader>();
  
  return (
    <div>
      <h1>Order {order.name}</h1>
      <Form method="post">
        <button name="action" value="cancel">Cancel Order</button>
      </Form>
    </div>
  );
}

const ORDER_QUERY = `#graphql
  query Order($id: ID!) {
    order(id: $id) {
      id
      name
      createdAt
    }
  }
`;