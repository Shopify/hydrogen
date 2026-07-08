import { Link } from "react-router";

export type Crumb = {
  label: string;
  href?: string;
};

type BreadcrumbsProps = {
  items: Crumb[];
};

/**
 * Server-rendered breadcrumb trail. The last crumb is `aria-current="page"`.
 * Reused by collection, collections, search, and product routes (F13).
 */
export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb">
      <ol
        role="list"
        className="text-on-surface-secondary flex flex-wrap items-center gap-1 text-sm"
      >
        <li>
          <Link to="/" className="hover:text-on-surface no-underline">
            Home
          </Link>
        </li>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1">
              <span aria-hidden="true">/</span>
              {item.href && !isLast ? (
                <Link to={item.href} className="hover:text-on-surface no-underline">
                  {item.label}
                </Link>
              ) : (
                <span
                  className="text-on-surface"
                  {...(isLast ? { "aria-current": "page" as const } : {})}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
