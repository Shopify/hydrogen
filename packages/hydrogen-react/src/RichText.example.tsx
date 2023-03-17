import {RichText} from '@shopify/hydrogen-react';

export function MainRichText({text}: {text: string}) {
  return <RichText as="main" data={JSON.parse(text)} />;
}
