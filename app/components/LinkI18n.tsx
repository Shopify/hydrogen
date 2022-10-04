import { Link, useParams } from "@remix-run/react";

export function LinkI18n(props: any) {
  const { to, ...resOfProps } = props;
  const { lang } = useParams();
  const hrefWithCountryLang = lang ? `/${lang}${to}` : to;

  return <Link to={hrefWithCountryLang} {...resOfProps} />
}
