import {Text} from './Text';
import {Link} from './Link';

interface Breadcrumb {
  handle: string;
  title: string;
  id: string;
}

// Renders a breadcrumb trail from a references metafield list
export function Breadcrumbs({
  breadcrumbs,
}: {
  breadcrumbs?: Breadcrumb[] | null;
}) {
  if (!breadcrumbs || breadcrumbs.length === 0) {
    return null;
  }

  const breadcrumbsMarkup = breadcrumbs.map((breadcrumb, index) => {
    const isLastBreadcrumb = index === breadcrumbs.length - 1;

    return isLastBreadcrumb ? (
      <Text key={breadcrumb.id} as="span">
        {breadcrumb.title}
      </Text>
    ) : (
      <span key={breadcrumb.id}>
        <Link to={`/collections/${breadcrumb.handle}`}>{breadcrumb.title}</Link>
        <span className="px-2">/</span>
      </span>
    );
  });

  return <nav className="flex items-center">{breadcrumbsMarkup}</nav>;
}
