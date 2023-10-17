---
'@shopify/cli-hydrogen': minor
---

We've added an experimental tool for profiling the CPU at startup. This is useful for debugging slow startup times when Oxygen deployments fail with related errors.

Run the new `h2 debug cpu` command to build + watch your app and generate a `startup.cpuprofile` file that you can open in DevTools or VSCode to see a flamegraph of CPU usage.
