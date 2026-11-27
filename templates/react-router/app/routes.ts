import type { RouteConfig } from "@react-router/dev/routes";
import { flatRoutes } from "@react-router/fs-routes";

import { addLocaleRoutes } from "./lib/locale-routes";
import { i18n } from "./lib/shop";

export default addLocaleRoutes(await flatRoutes(), i18n) satisfies RouteConfig;
