import {type MetaFunction} from '@shopify/remix-oxygen';

export const meta: MetaFunction = () => {
  return {
    title: 'Hydrogen',
    description: 'A custom storefront powered by Hydrogen',
  };
};

export default function Index() {
  return (
    <p>
      Edit this route in <em>app/routes/index.tsx</em>.
    </p>
  );
}
