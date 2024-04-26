function getLocaleFromRequest(request) {
  const defaultLocale = { language: "EN", country: "US" };
  const supportedLocales = {
    ES: "ES",
    FR: "FR",
    DE: "DE",
    JP: "JA"
  };
  const url = new URL(request.url);
  const firstSubdomain = url.hostname.split(".")[0]?.toUpperCase();
  return supportedLocales[firstSubdomain] ? { language: supportedLocales[firstSubdomain], country: firstSubdomain } : defaultLocale;
}

export { getLocaleFromRequest };
