---
'@shopify/cli-hydrogen': minor
---

Enable debugger connections by passing `--debug` flag to the `h2 dev` command:

- Current default runtime (Node.js sandbox): `h2 dev --debug`.
- New Worker runtime: `h2 dev --debug --worker-unstable`.

You can then connect to the port `9222` (configurable with the new `--inspector-port` flag) to start step debugging.

For example, in Chrome you can go to `chrome://inspect` and make sure the inspector port is added to the network targets. In VSCode, you can add the following to your `.vscode/launch.json`:

```
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Hydrogen",
      "type": "node",
      "request": "attach",
      "port": 9222,
      "cwd": "/",
      "resolveSourceMapLocations": null,
      "attachExistingChildren": false,
      "autoAttachChildProcesses": false,
      "restart": true
    }
  ]
}
```
