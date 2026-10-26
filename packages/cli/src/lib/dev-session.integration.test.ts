import {spawn} from 'node:child_process';
import {mkdtemp, readdir, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {once} from 'node:events';
import {build} from 'esbuild';
import {expect, it, vi} from 'vitest';

it.skipIf(process.platform === 'win32').each([
  ['SIGINT', false, 130, false],
  ['SIGTERM', false, 143, false],
  ['SIGTERM', true, 143, false],
  ['SIGINT', false, 130, true],
  ['SIGTERM', false, 143, true],
  ['SIGTERM', true, 143, true],
] as const)(
  'drains output and releases resources on %s (startup pending: %s, exit: %s, JSON: %s)',
  async (signal, pending, exitCode, json) => {
    const sourceDirectory = fileURLToPath(new URL('.', import.meta.url));
    const fixtureDirectory = await mkdtemp(
      join(sourceDirectory, '.session-fixture-'),
    );
    const projectDirectory = await mkdtemp(
      join(tmpdir(), 'hydrogen-session-process-'),
    );
    let child: ReturnType<typeof spawn> | undefined;
    try {
      const bundle = join(fixtureDirectory, 'session.mjs');
      await build({
        entryPoints: [join(sourceDirectory, 'dev-session.ts')],
        outfile: bundle,
        bundle: true,
        packages: 'external',
        platform: 'node',
        format: 'esm',
      });
      child = spawn(
        process.execPath,
        [
          '--input-type=module',
          '--eval',
          `
      import {runDevSession} from ${JSON.stringify(pathToFileURL(bundle).href)};
      await runDevSession({command: 'hydrogen dev', directory: ${JSON.stringify(projectDirectory)}, envFile: '.env', json: ${json}}, async (session) => {
        const timer = setInterval(() => console.log('Worker output'), 10);
        session.cleanup(async () => {
          clearInterval(timer);
          for (let index = 0; index < 1000; index++) console.log('Shutdown ' + index);
          console.error('Worker closed');
        });
        ${pending ? '' : "await session.ready(['http://localhost:3000/']);"}
        console.log('Fixture started');
        ${pending ? "await new Promise((resolve) => session.signal.addEventListener('abort', resolve, {once: true}));" : ''}
      });
    `,
        ],
        {stdio: ['ignore', 'pipe', 'pipe']},
      );
      let stdout = '';
      let stderr = '';
      child.stdout!.on('data', (chunk) => {
        stdout += chunk;
      });
      child.stderr!.on('data', (chunk) => {
        stderr += chunk;
      });
      const exited = once(child, 'exit');
      await vi.waitFor(() => expect(stdout).toContain('Fixture started'), {
        timeout: 10000,
      });
      child.kill(signal);
      expect((await exited)[0]).toBe(exitCode);
      expect(stdout).toContain('Shutdown 999');
      if (json) expect(stdout).toContain('Worker closed');
      else expect(stderr).toContain('Worker closed');
      const folder = join(projectDirectory, '.shopify', 'dev');
      const files = await readdir(folder);
      expect(files).toHaveLength(1);
      expect(files[0]).toMatch(/\.jsonl$/);
      const log = await readFile(join(folder, files[0]!), 'utf8');
      if (json) expect(stdout).toBe(log);
      const records = (await readFile(join(folder, files[0]!), 'utf8'))
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line));
      expect(
        records.filter(({message}) => message.startsWith('Shutdown ')),
      ).toHaveLength(1000);
      expect(records.at(-1)).toMatchObject({message: 'Runtime stopped'});
    } finally {
      if (child && child.exitCode === null) {
        const exited = once(child, 'exit');
        child.kill('SIGKILL');
        await exited;
      }
      await Promise.all(
        [fixtureDirectory, projectDirectory].map((directory) =>
          rm(directory, {recursive: true, force: true}),
        ),
      );
    }
  },
  20000,
);

it.skipIf(process.platform === 'win32').each([
  ['SIGINT', 130],
  ['SIGTERM', 143],
] as const)(
  'exits stuck startup on %s and allows the next session to reclaim ownership',
  async (signal, exitCode) => {
    const sourceDirectory = fileURLToPath(new URL('.', import.meta.url));
    const fixtureDirectory = await mkdtemp(
      join(sourceDirectory, '.session-fixture-'),
    );
    const projectDirectory = await mkdtemp(
      join(tmpdir(), 'hydrogen-stuck-session-'),
    );
    let child: ReturnType<typeof spawn> | undefined;
    try {
      const bundle = join(fixtureDirectory, 'session.mjs');
      await build({
        entryPoints: [join(sourceDirectory, 'dev-session.ts')],
        outfile: bundle,
        bundle: true,
        packages: 'external',
        platform: 'node',
        format: 'esm',
      });
      const importSession = `import {runDevSession} from ${JSON.stringify(pathToFileURL(bundle).href)};`;
      const options = JSON.stringify({
        command: 'hydrogen dev',
        directory: projectDirectory,
        envFile: '.env',
      });
      child = spawn(
        process.execPath,
        [
          '--input-type=module',
          '--eval',
          `${importSession}
          await runDevSession(${options}, async (session) => {
            session.cleanup(() => console.log('Cleanup ran'));
            setInterval(() => {}, 1000);
            console.log('Fixture started');
            await new Promise(() => {});
          });`,
        ],
        {stdio: ['ignore', 'pipe', 'pipe']},
      );
      let stdout = '';
      child.stdout!.on('data', (chunk) => {
        stdout += chunk;
      });
      const exited = once(child, 'exit');
      await vi.waitFor(() => expect(stdout).toContain('Fixture started'), {
        timeout: 10000,
      });
      child.kill(signal);
      await vi.waitFor(() => expect(child!.exitCode).toBe(exitCode), {
        timeout: 10000,
      });
      expect((await exited)[0]).toBe(exitCode);
      expect(stdout).toContain('Cleanup ran');

      child = spawn(
        process.execPath,
        [
          '--input-type=module',
          '--eval',
          `${importSession}
          await runDevSession({...${options}, signal: AbortSignal.abort()}, async () => {});`,
        ],
        {stdio: ['ignore', 'pipe', 'pipe']},
      );
      const recovered = once(child, 'exit');
      await vi.waitFor(() => expect(child!.exitCode).toBe(0), {
        timeout: 10000,
      });
      expect((await recovered)[0]).toBe(0);
      expect(
        (await readdir(join(projectDirectory, '.shopify', 'dev'))).every(
          (name) => name.endsWith('.jsonl'),
        ),
      ).toBe(true);
    } finally {
      if (child && child.exitCode === null) {
        const exited = once(child, 'exit');
        child.kill('SIGKILL');
        await exited;
      }
      await Promise.all(
        [fixtureDirectory, projectDirectory].map((directory) =>
          rm(directory, {recursive: true, force: true}),
        ),
      );
    }
  },
  30000,
);
