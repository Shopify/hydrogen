import { Link, useParams } from "@remix-run/react";

export function LinkI18n(props: any) {
  const { to, ...resOfProps } = props;
  const { language } = useParams();
  const hrefWithCountryLang = language ? `/${language}${to}` : to;

  return <Link to={hrefWithCountryLang} {...resOfProps} />
}
