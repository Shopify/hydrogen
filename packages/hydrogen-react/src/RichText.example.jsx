import {RichText} from '@shopify/hydrogen-react';

export function MainRichText({text}) {
  return (
    <RichText
      data={JSON.parse(text)}
      components={{
        paragraph({node}) {
          return <p className="customClass">{node.children}</p>;
        },
      }}
    />
  );
}
