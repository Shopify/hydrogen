import {useTranslation} from 'react-i18next';
import {LocalizedLink} from '~/components/LocalizedLink';

export default function NotFound() {
  const {t} = useTranslation();
  return (
    <div>
      <h1>404 - {t('notFound.title')}</h1>
      <h4>{t('notFound.subtitle')}</h4>
      <p>{t('notFound.description')}</p>
      <br />
      <LocalizedLink to="/">{t('notFound.cta')} →</LocalizedLink>
    </div>
  );
}
