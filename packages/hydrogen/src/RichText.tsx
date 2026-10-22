import {Link} from 'react-router';
import {
  RichText as OriginalRichText,
  isSafeRichTextUrl,
} from '@shopify/hydrogen-react';

export const RichText: typeof OriginalRichText = function (props) {
  return (
    <OriginalRichText
      {...props}
      components={{
        link: ({node}) => {
          if (!isSafeRichTextUrl(node.url)) return node.children;

          return (
            <Link
              to={node.url}
              title={node.title}
              target={node.target}
              prefetch="intent"
            >
              {node.children}
            </Link>
          );
        },
        ...props.components,
      }}
    />
  );
};
