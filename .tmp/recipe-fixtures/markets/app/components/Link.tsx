import type {LinkProps, NavLinkProps} from 'react-router';
import {Link as ReactLink, NavLink as ReactNavLink} from 'react-router';
import {useLocalizedPath, cleanPath} from '../lib/i18n';
import type {Locale} from '../lib/i18n';

type BaseProps = {
  locale?: Locale;
  preservePath?: boolean;
};

type LinkVariantProps = BaseProps &
  LinkProps & {
    variant?: never;
  };

type NavLinkVariantProps = BaseProps &
  NavLinkProps & {
    variant: 'nav';
  };

export type ExtendedLinkProps = LinkVariantProps | NavLinkVariantProps;

/**
 * Locale-aware Link component that handles both regular and navigation links
 *
 * @example
 * // Regular link (auto-adds current locale)
 * <Link to="/products">Products</Link>
 *
 * @example
 * // Navigation link with active styles
 * <Link variant="nav" to="/about" style={activeStyle}>About</Link>
 *
 * @example
 * // Switch locale while preserving current path
 * <Link to="/" locale={frenchLocale} preservePath>Français</Link>
 *
 * @example
 * // Link to specific locale
 * <Link to="/products" locale={canadianLocale}>Canadian Products</Link>
 */
export function Link(props: ExtendedLinkProps) {
  const {locale, preservePath = false, variant, ...restProps} = props;
  let to = restProps.to;

  // Auto-clean menu URLs for navigation links
  if (variant === 'nav' && typeof to === 'string') {
    if (to.includes('://')) {
      try {
        to = new URL(to).pathname;
      } catch {
        // Keep original URL
      }
    }
    to = cleanPath(to);
  }

  to = useLocalizedPath(to, locale, preservePath);

  if (variant === 'nav') {
    return <ReactNavLink {...(restProps as NavLinkProps)} to={to} />;
  }
  return <ReactLink {...(restProps as LinkProps)} to={to} />;
}
