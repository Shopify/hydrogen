import {it, expect} from 'vitest';
import {build} from 'esbuild';
import {mkdtemp, rm, symlink, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

it('profiles fresh module startup and cleans up after evaluation errors', async () => {
  const root = await mkdtemp(join(tmpdir(), 'hydrogen-cpu-'));
  const source = fileURLToPath(new URL('./cpu-profiler.ts', import.meta.url));
  const cliRoot = resolve(dirname(source), '../..');
  try {
    await symlink(join(cliRoot, 'node_modules'), join(root, 'node_modules'));
    await build({
      entryPoints: [source],
      outfile: join(root, 'profiler.mjs'),
      bundle: true,
      packages: 'external',
      platform: 'node',
      format: 'esm',
    });
    await writeFile(
      join(root, 'worker.js.map'),
      JSON.stringify({
        version: 3,
        sources: ['server.ts'],
        names: [],
        mappings: 'AAAA',
      }),
    );
    await writeFile(
      join(root, 'test.mjs'),
      `
      import assert from 'node:assert/strict';
      import {writeFile} from 'node:fs/promises';
      import {createCpuStartupProfiler} from './profiler.mjs';
      const profiler = await createCpuStartupProfiler();
      const script = ${JSON.stringify(join(root, 'worker.js'))};
      const entry = [
        'import {sep} from "node:path";',
        'const {basename} = await import("node:path");',
        'if (basename("a" + sep + "b") !== "b") throw new Error("builtin import failed");',
        'globalThis.startups = (globalThis.startups ?? 0) + 1;',
        'if (globalThis.startups !== 1) throw new Error("warm global context");',
        'if (self !== globalThis || !caches.default || typeof caches.open !== "function") throw new Error("Worker globals missing");',
        'if (new URL(new Request("https://example.com").url).hostname !== "example.com") throw new Error("web APIs missing");',
        'if (typeof crypto.subtle.digest !== "function" || new TextEncoder().encode("x").length !== 1) throw new Error("web primitives missing");',
        'function startupWork() { const end = performance.now() + 40; while (performance.now() < end) {} }',
        'startupWork();',
        // Runtime-only imports must not stop the profiler from loading the app.
        'export const loadRoute = (id) => import(id);',
      ].join(' ');
      await writeFile(script, entry);
      for (let i = 0; i < 2; i++) {
        const result = await profiler.run(script);
        assert.ok(result.profile.nodes.some(n => n.callFrame.functionName === 'startupWork'));
        assert.ok(result.totalScriptTimeMs > 0);
      }
      assert.equal(globalThis.startups, undefined);
      await writeFile(script, 'throw new Error("startup failed")');
      await assert.rejects(profiler.run(script), /startup failed/);
      await writeFile(script, 'import "unbundled-dependency"');
      await assert.rejects(profiler.run(script), /Cannot profile an unbundled import/);
      for (const builtin of ['child_process', 'fs', 'fs/promises', 'net', 'http', 'https', 'tls', 'dgram', 'worker_threads', 'process', 'module', 'vm', 'inspector']) {
        for (const specifier of [builtin, 'node:' + builtin]) {
          for (const entry of ['import "' + specifier + '";', 'await import("' + specifier + '");']) {
            await writeFile(script, entry);
            await assert.rejects(profiler.run(script), /Cannot profile unsupported Node built-in/);
          }
        }
      }
      // These APIs exist in Workers, but workerd rejects them at module scope.
      for (const entry of ['setTimeout(() => {}, 0)', 'setInterval(() => {}, 1000)', 'fetch("https://example.com")']) {
        await writeFile(script, entry);
        await assert.rejects(profiler.run(script), /unavailable during Worker startup/);
      }
      // A failed evaluation must not leave the inspector profiling session open.
      await writeFile(script, entry);
      assert.ok((await profiler.run(script)).totalScriptTimeMs > 0);
      console.log('profile verified');
    `,
    );
    const {stdout} = await promisify(execFile)(
      process.execPath,
      ['--experimental-vm-modules', join(root, 'test.mjs')],
      {timeout: 15_000},
    );
    expect(stdout.trim()).toBe('profile verified');
  } finally {
    await rm(root, {recursive: true, force: true});
  }
});
