declare function fileUrlToPath(url: string): string;
declare const VIRTUAL_ROUTES_DIR = "vite/virtual-routes/routes";
declare const VIRTUAL_ROUTES_ROUTES_DIR_PARTS: string[];
declare const VIRTUAL_ROUTES_DIR_PARTS: string[];
declare const VIRTUAL_ROOT = "vite/virtual-routes/virtual-root";
declare function getVirtualRoutesV3(): Promise<{
    routes: {
        id: string;
        path: string;
        file: string;
        index: boolean;
    }[];
    layout: {
        file: string;
    };
}>;
declare const VIRTUAL_ROUTES_DIR_ORIG = "virtual-routes/routes";
declare const VIRTUAL_ROOT_ORIG = "virtual-routes/virtual-root-with-layout";
declare function getVirtualRoutes(): Promise<{
    root: {
        id: string;
        path: string;
        file: string;
    };
}>;

export { VIRTUAL_ROOT, VIRTUAL_ROOT_ORIG, VIRTUAL_ROUTES_DIR, VIRTUAL_ROUTES_DIR_ORIG, VIRTUAL_ROUTES_DIR_PARTS, VIRTUAL_ROUTES_ROUTES_DIR_PARTS, fileUrlToPath, getVirtualRoutes, getVirtualRoutesV3 };
