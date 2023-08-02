import {useEffect, useState} from 'react';

type SectionProps = {
  editable: boolean;
  editUrl: string | undefined;
};

type BaseSectionProps = {
  id: string;
  type: string;
};

/**
 * A function that takes a metaobject section and returns a new component that is
 * wrapped in a component that when hovered and only during dev mode
 * it displays an button that links to the admin page for the section metaobject entry
 * @param Component
 * @example
 * ```ts
 * import {defineSection} from '@shopify/hydrogen';
 *
 * export const ImageText = defineSection(
 *  ({heading, image}: ImageTextFragment) => {
 *    return (
 *     <h1>{heading.value}</h1>
 *    )
 * })
 */
export function defineSection<P extends BaseSectionProps>(
  Component: React.ComponentType<P & SectionProps>,
) {
  const displayName = Component?.displayName || Component.name || 'Component';

  function WrappedComponent(props: P) {
    const [isDev, setIsDev] = useState<boolean | undefined>(undefined);
    const [isHovered, setIsHoverd] = useState<boolean>(false);
    const [publicStoreDomain, setPublicStoreDomain] = useState<
      string | undefined
    >(undefined);

    // detect if we are in dev mode and capture the publicStoreDomain
    useEffect(() => {
      if (typeof isDev === 'boolean') return;

      const isLocalhost = Boolean(
        true ||
          window.location.href.includes('localhost') ||
          window.location.href.includes('127.0.0.1'),
      );

      if (window.__remixContext.state.loaderData?.root?.publicStoreDomain) {
        setPublicStoreDomain(
          String(window.__remixContext.state.loaderData.root.publicStoreDomain),
        );
      }

      setIsDev(isLocalhost);
    }, [isDev]);

    const sectionProps = {
      ...props,
      editable: Boolean(isDev),
      editUrl: publicStoreDomain
        ? `https://admin.shopify.com/store/${publicStoreDomain
            .split('.')
            .at(0)}/content/entries/${props.type}/${props.id.split('/').pop()}`
        : undefined,
    };

    return (
      <div
        section-id={props.id}
        section-type={props.type}
        onMouseEnter={() => setIsHoverd(true)}
        onMouseLeave={() => setIsHoverd(false)}
        style={isDev ? {position: 'relative'} : {}}
      >
        {isDev && isHovered && sectionProps?.editUrl && (
          <EditSection editUrl={sectionProps.editUrl} />
        )}
        <Component {...sectionProps} />
      </div>
    );
  }

  WrappedComponent.display = `Section${displayName}`;

  return WrappedComponent;
}

/**
 * An edit button that appears in the top right corner of a section when hovered.
 * it links to the admin page for the section metaobject entry
 * @param editUrl
 */
function EditSection({editUrl}: {editUrl: string}) {
  return (
    <a
      href={editUrl}
      target="_blank"
      style={{
        backgroundColor: 'black',
        color: 'white',
        fontSize: '1rem',
        padding: '0.75rem',
        position: 'absolute',
        right: '1rem',
        top: '1rem',
        zIndex: 1,
      }}
    >
      Edit
    </a>
  );
}
