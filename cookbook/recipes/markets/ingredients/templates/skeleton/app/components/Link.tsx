import {LinkProps, Link as ReactLink} from 'react-router';
import {useSelectedLocale} from '../lib/i18n';

export function Link({...props}: LinkProps) {
  const selectedLocale = useSelectedLocale();

  const prefix = selectedLocale?.pathPrefix.replace(/\/+$/, '') ?? '';
  const to = `${prefix}${props.to}`;

  return <ReactLink {...props} to={to} />;
}
