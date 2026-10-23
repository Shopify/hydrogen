import {Link} from 'react-router';
import {RichText as OriginalRichText} from '@shopify/hydrogen-react';
import {isSafeRichTextUrl} from '@shopify/hydrogen-react/is-safe-rich-text-url';

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
