import { RouteConfigEntry } from '@react-router/dev/routes';

declare function hydrogenRoutes(currentRoutes: Array<RouteConfigEntry>): Promise<Array<RouteConfigEntry>>;

export { hydrogenRoutes };
