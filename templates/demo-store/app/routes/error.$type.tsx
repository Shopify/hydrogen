import {useLoaderData} from '@remix-run/react';
import {type LoaderFunctionArgs, json} from '@shopify/remix-oxygen';

export async function loader({params}: LoaderFunctionArgs) {
  switch (params.type) {
    case 'a':
      // @ts-expect-error
      console.log(params.it.broke);
      break;
    case 'b':
      throw new Error('throw it broke bad');
    case 'c':
      console.error(new Error('consol.error it broke bad'));
      break;
    case 'd':
      console.warn(new Error('consol.warn it broke not as bad'));
      break;
    case 'e':
      console.info(new Error('consol.info it broke not as bad'));
      break;
    case 'f':
      throw 'some string';
    case 'g':
      throw {some: 'object'};
  }

  return json({});
}

export default function () {
  const data = useLoaderData();
  return <div>An example error page</div>;
}
