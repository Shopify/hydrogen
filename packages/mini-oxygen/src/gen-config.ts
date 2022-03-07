#!/usr/bin/env npx ts-node

const tpl = `{
    "port": 3000,
    "workerFile": "dist/worker/index.js",
    "assetsDir": "dist/client",
    "buildWatchPaths": ["./src"],
    "buildCommand": "yarn build"
}
`;

console.log(tpl);
