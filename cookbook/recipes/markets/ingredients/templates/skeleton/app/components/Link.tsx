import {Link as RemixLink} from '@remix-run/react';
import {RemixLinkProps} from '@remix-run/react/dist/components';
import {useSelectedLocale} from '../lib/i18n';

export function Link({...props}: RemixLinkProps) {
  const selectedLocale = useSelectedLocale();
  const to =
    selectedLocale != null
      ? `${selectedLocale.pathPrefix}${props.to}`
      : props.to;
  return <RemixLink {...props} to={to} />;
}
