import type {ParsedMetafields} from '@shopify/hydrogen';
import React from 'react';
import type {SectionRichTextFragment} from 'storefrontapi.generated';
import {parseSection} from '~/utils/parseSection';

type RichTextNodeTypes =
  | 'heading'
  | 'link'
  | 'list'
  | 'listItem'
  | 'paragraph'
  | 'root'
  | 'text';

type RichTextASTNode = {
  type: RichTextNodeTypes;
  children?: RichTextASTNode[];
  level?: number;
  value?: string;
  bold?: boolean;
  italic?: boolean;
  url?: string;
  title?: string;
  target?: string;
  listType?: string;
};

export function SectionRichText(props: SectionRichTextFragment) {
  const section = parseSection<
    SectionRichTextFragment,
    // override metafields types that have been parsed
    {
      code?: ParsedMetafields['single_line_text_field'];
    }
  >(props);

  const {id, code} = section;
  const parsedCode = JSON.parse(code?.value ?? '{}') as {
    type: 'root';
    children: Element[];
  } as unknown as RichTextASTNode;

  return (
    <section key={id}>
      <RichText.Root data={parsedCode} />
    </section>
  );
}

export const SECTION_RICHTEXT_FRAGMENT = `#graphql
  fragment SectionRichText on Metaobject {
    id
    type
    code: field(key: "code") {
      type
      key
      value
    }
  }
`;

type RichTextProps = {
  data: RichTextASTNode;
  children: (data: RichTextASTNode) => React.ReactNode;
};

function RichText({data, children}: RichTextProps) {
  return typeof children === 'function'
    ? (children(data) as React.ReactElement)
    : typeof children === 'string'
    ? children
    : null;
}

function Link({data}: {data: RichTextASTNode}) {
  return (
    <a href={data.url} title={data.title} target={data.target}>
      {data.children?.map((child, index) => (
        // eslint-disable-next-line react/no-array-index-key
        <RichText data={child} key={`link-${index}`}>
          {(data) => {
            switch (data.type) {
              case 'text':
                return <Text data={data} />;
              default:
                return null;
            }
          }}
        </RichText>
      ))}
    </a>
  );
}

function Heading({data}: {data: RichTextASTNode}) {
  function HeadingTag({children}: {children: React.ReactNode}) {
    return data.level === 1 ? (
      <h1>{children}</h1>
    ) : data.level === 2 ? (
      <h2>{children}</h2>
    ) : data.level === 3 ? (
      <h3>{children}</h3>
    ) : data.level === 4 ? (
      <h4>{children}</h4>
    ) : data.level === 5 ? (
      <h5>{children}</h5>
    ) : data.level === 6 ? (
      <h6>{children}</h6>
    ) : null;
  }

  return (
    <HeadingTag>
      {data.children?.map((child, index) => (
        // eslint-disable-next-line react/no-array-index-key
        <RichText data={child} key={`heading-${index}`}>
          {(data) => {
            switch (data.type) {
              case 'text':
                return <Text data={data} />;
              case 'link':
                // eslint-disable-next-line jsx-a11y/anchor-has-content
                return <Link data={data} />;
              default:
                return null;
            }
          }}
        </RichText>
      ))}
    </HeadingTag>
  );
}

function Text({data}: {data: RichTextASTNode}) {
  return (
    <span
      style={{
        fontWeight: data.bold ? 'bold' : 'normal',
        fontStyle: data.italic ? 'italic' : 'normal',
      }}
    >
      {data.value}
    </span>
  );
}

function Paragraph({data}: {data: RichTextASTNode}) {
  return (
    <p>
      {data.children?.map((child, index) => (
        // eslint-disable-next-line react/no-array-index-key
        <RichText data={child} key={`paragraph-${index}`}>
          {(data) => {
            switch (data.type) {
              case 'text':
              case 'heading':
                return <Text data={data} />;
              case 'link':
                // eslint-disable-next-line jsx-a11y/anchor-has-content
                return <Link data={data} />;
              default:
                return null;
            }
          }}
        </RichText>
      ))}
    </p>
  );
}

function Root({data}: {data: RichTextASTNode}) {
  return (
    <>
      {data.children?.map((child, index) => (
        // eslint-disable-next-line react/no-array-index-key
        <RichText data={child} key={`root-${index}`}>
          {(data) => {
            switch (data.type) {
              case 'root':
                return <RichText.Root data={data} />;
              case 'paragraph':
                return <RichText.Paragraph data={data} />;
              case 'heading':
                return <RichText.Heading data={data} />;
              case 'text':
                return <RichText.Text data={data} />;
              case 'link':
                return <RichText.Link data={data} />;
              default:
                return null;
            }
          }}
        </RichText>
      ))}
    </>
  );
}

RichText.Heading = Heading;
RichText.Link = Link;
RichText.Paragraph = Paragraph;
RichText.Root = Root;
RichText.Text = Text;
