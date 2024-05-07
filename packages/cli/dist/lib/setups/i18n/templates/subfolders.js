function getLocaleFromRequest(request) {
  const url = new URL(request.url);
  const firstPathPart = url.pathname.split("/")[1]?.toUpperCase() ?? "";
  let pathPrefix = "";
  let [language, country] = ["EN", "US"];
  if (/^[A-Z]{2}-[A-Z]{2}$/i.test(firstPathPart)) {
    pathPrefix = "/" + firstPathPart;
    [language, country] = firstPathPart.split("-");
  }
  return { language, country, pathPrefix };
}

export { getLocaleFromRequest };
