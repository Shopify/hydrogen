import {Link as RemixLink} from '@remix-run/react';
import {RemixLinkProps} from '@remix-run/react/dist/components';
import {useSelectedLocale} from '../lib/i18n';

export function Link({...props}: RemixLinkProps) {
  const selectedLocale = useSelectedLocale();

  const prefix = selectedLocale?.pathPrefix.replace(/\/+$/, '') ?? '';
  const to = `${prefix}${props.to}`;

  return <RemixLink {...props} to={to} />;
}
