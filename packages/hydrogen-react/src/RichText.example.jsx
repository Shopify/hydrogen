import {RichText} from '@shopify/hydrogen-react';

export function MainRichText({text}) {
  return (
    <RichText
      data={JSON.parse(text)}
      components={{
        // Customize how a paragraph is rendered. `next` must be called on
        // children nodes to recursively render the rich text output
        paragraph({node, next}) {
          return <p className="customClass">{node.children.map(next)}</p>;
        },
      }}
    />
  );
}
