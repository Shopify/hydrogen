import { Link, useParams } from "@remix-run/react";

export function LinkI18n(props: any) {
  const { to, ...resOfProps } = props;
  const hrefWithCountryLang = getI18nPath(to);

  return <Link to={hrefWithCountryLang} {...resOfProps} />
}

export function getI18nPath(to: string) {
  const { lang } = useParams();
  return lang ? `/${lang}${to}` : to;
}
