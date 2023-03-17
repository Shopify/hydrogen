import {RichText} from '@shopify/hydrogen-react';

export function MainRichText({text}) {
  return <RichText as="main" data={JSON.parse(text)} />;
}
