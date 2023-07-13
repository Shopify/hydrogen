import {useMatches, Link} from '@remix-run/react';
import type {FooterQuery} from 'storefrontapi.generated';

export function Footer({menu}: FooterQuery) {
  return (
    <footer>
      <hr />
      <FooterMenu menu={menu} />
    </footer>
  );
}

function FooterMenu({menu}: Pick<FooterQuery, 'menu'>) {
  const [root] = useMatches();
  const publicStoreDomain = root?.data?.publicStoreDomain;
  if (!menu)
    return (
      <mark style={{margin: '1rem', display: 'inline-block'}}>
        Footer menu <code>skeleton-footer</code> not configured.
      </mark>
    );
  return (
    <nav
      role="navigation"
      style={{
        alignItems: 'center',
        display: 'flex',
        gridGap: '1rem',
        padding: '1rem',
      }}
    >
      {menu.items.map((item) => {
        if (!item.url) return null;
        const url = item.url.includes(publicStoreDomain)
          ? new URL(item.url).pathname
          : item.url;
        const isExternal = !url.startsWith('/');
        return isExternal ? (
          <a
            key={item.id}
            href={url}
            style={{textTransform: 'uppercase'}}
            target="_blank"
            rel="noopener noreferrer"
          >
            {item.title}
          </a>
        ) : (
          <Link
            key={item.id}
            prefetch="intent"
            style={{textTransform: 'uppercase'}}
            to={url}
          >
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
}
