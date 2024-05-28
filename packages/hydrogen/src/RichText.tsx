import {Link} from '@remix-run/react';
import {RichText as OriginalRichText} from '@shopify/hydrogen-react';

export const RichText: typeof OriginalRichText = function (props) {
  return (
    <OriginalRichText
      {...props}
      components={{
        link: ({node}) => (
          <Link
            to={node.url}
            title={node.title}
            target={node.target}
            prefetch="intent"
          >
            {node.children}
          </Link>
        ),
        ...props.components,
      }}
    />
  );
};
