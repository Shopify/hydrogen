# Streaming JSON output

`hydrogen codegen --json --watch` and `hydrogen build --json --watch` write one compact JSON object per line
(JSONL) to stdout. This is a continuous stream with no final result object.
Without `--watch`, the existing single JSON result is unchanged. `--no-input`
controls prompts independently from the output format.

The stream starts with `{"type":"watch-started","directory":"/absolute/project"}`.
Each generation has a positive, increasing `cycle`: `generation-started`, then
`generation-completed` with `files: [{path, sources}]`, or `generation-failed`
with `error: {message}`. Paths are absolute native filesystem paths; source
patterns and generated file contents retain their existing formats. A failed
generation is recoverable; later source changes retry it.

Build watch uses `build-started`, followed by `build-completed` or `build-failed`,
with the same cycle numbering. A completed build includes `directory`,
`clientDirectory`, `serverDirectory`, and `serverPath`, using the finite build
result's meanings. Completion follows the server's bundle write after the client
build succeeds. Client and server compilation failures are recoverable. Shutdown
closes both Vite watchers; a server setup failure also closes the client watcher.

JSON mode watches configured schemas and documents, project configuration, and
React Router sources, excluding dependencies, Git data, build output,
React Router's generated types, and the reported GraphQL output files. Generation
cycles run serially and coalesce changes received during a cycle. Configurations
are reloaded for each cycle. Text mode retains GraphQL Codegen's native watcher.

Diagnostics belong to stderr. CLI Kit diagnostics use its existing JSON event
schema; dependencies may also write native warnings to stderr. Consumers must
read stdout and stderr separately. `--json-schema` and non-interactive help
describe both the finite result and watch records.

SIGINT and SIGTERM stop the watcher, wait for active generation and file writes,
then emit `{"type":"watch-stopped"}`. Their exit codes are 130 and 143,
respectively. Fatal setup or watcher errors close owned resources and use CLI
Kit's existing compact `{error: {...}}` document on stdout with a nonzero exit.
An abruptly killed process cannot emit a shutdown record.

`hydrogen debug cpu --json` uses the same watch and build records. Each successful
server build is followed by `profile-started`, then `profile-completed` or
`profile-failed`. These records share the build's `cycle`. A completed profile
includes the absolute `path`, `format: "cpuprofile"`, `totalTimeMs` for the sampled
interval, and `totalScriptTimeMs` for module startup. Measurements are nonnegative
milliseconds. The file retains the native Chrome DevTools CPU profile format;
its nodes and sampling fields are never wrapped or copied into the stream.
Each success replaces the configured profile file. Evaluation failures preserve
the previous file and allow the next build to retry. Shutdown waits for active
profiling and file writes before closing both build watchers.
