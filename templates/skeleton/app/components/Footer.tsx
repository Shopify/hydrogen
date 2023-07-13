import {useMatches, Link} from '@remix-run/react';
import type {FooterQuery} from 'storefrontapi.generated';

export function Footer({menu}: FooterQuery) {
  return (
    <footer className="footer">
      <FooterMenu menu={menu} />
    </footer>
  );
}

function FooterMenu({menu}: Pick<FooterQuery, 'menu'>) {
  const [root] = useMatches();
  const publicStoreDomain = root?.data?.publicStoreDomain;
  if (!menu)
    return (
      <mark className="footer-menu-missing">
        Footer menu <code>skeleton-footer</code> not configured.
      </mark>
    );
  return (
    <nav className="footer-menu" role="navigation">
      {menu.items.map((item) => {
        if (!item.url) return null;
        const url = item.url.includes(publicStoreDomain)
          ? new URL(item.url).pathname
          : item.url;
        const isExternal = !url.startsWith('/');
        return isExternal ? (
          <a
            className="footer-menu-item"
            href={url}
            key={item.id}
            rel="noopener noreferrer"
            target="_blank"
          >
            {item.title}
          </a>
        ) : (
          <Link
            className="footer-menu-item"
            key={item.id}
            prefetch="intent"
            to={url}
          >
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
}
