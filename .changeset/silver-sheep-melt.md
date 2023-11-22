---
'@shopify/cli-hydrogen': minor
---

Enable debugger connections by passing `--debug` flag to the `h2 dev` command:

- Current default runtime (Node.js sandbox): `h2 dev --debug`.
- New Worker runtime: `h2 dev --debug --worker`.

You can then connect to the port `9229` (configurable with the new `--inspector-port` flag) to start step debugging.

When using `--worker`, an improved version of the DevTools will be available in `localhost:9229`. Otherwise, in Chrome you can go to `chrome://inspect` to open the DevTools -- make sure the inspector port is added to the network targets.

Alternatively, in VSCode, you can add the following to your `.vscode/launch.json`:

```
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Hydrogen",
      "type": "node",
      "request": "attach",
      "port": 9229,
      "cwd": "/",
      "resolveSourceMapLocations": null,
      "attachExistingChildren": false,
      "autoAttachChildProcesses": false,
      "restart": true
    }
  ]
}
```
