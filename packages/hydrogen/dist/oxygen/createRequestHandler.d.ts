import { ServerBuild } from 'react-router';

declare function createRequestHandler<Context = unknown>({ build, mode, poweredByHeader, getLoadContext, }: {
    build: ServerBuild;
    mode?: string;
    poweredByHeader?: boolean;
    getLoadContext?: (request: Request) => Promise<Context> | Context;
}): (request: Request) => Promise<Response>;

export { createRequestHandler };
