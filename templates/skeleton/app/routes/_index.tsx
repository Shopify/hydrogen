import {type LoaderFunctionArgs} from '@shopify/remix-oxygen';
import {type MetaFunction} from 'react-router';

export const meta: MetaFunction = () => {
  return [{title: 'Hydrogen | Home'}];
};

export async function loader(args: LoaderFunctionArgs) {}

export default function Homepage() {
  return (
    <div className="home">
      <h1>Skeleton</h1>
    </div>
  );
}
