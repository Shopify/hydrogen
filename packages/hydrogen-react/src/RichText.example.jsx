import {RichText} from '@shopify/hydrogen-react';

export function MainRichText({metaFieldData}) {
  return (
    <RichText
      data={metaFieldData}
      components={{
        paragraph({node}) {
          return <p className="customClass">{node.children}</p>;
        },
      }}
    />
  );
}
