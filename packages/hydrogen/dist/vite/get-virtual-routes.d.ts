declare const VIRTUAL_ROUTES_DIR = "vite/virtual-routes/routes";
declare const VIRTUAL_ROUTES_ROUTES_DIR_PARTS: string[];
declare const VIRTUAL_ROUTES_DIR_PARTS: string[];
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

export { VIRTUAL_ROUTES_DIR, VIRTUAL_ROUTES_DIR_PARTS, VIRTUAL_ROUTES_ROUTES_DIR_PARTS, getVirtualRoutesV3 };
