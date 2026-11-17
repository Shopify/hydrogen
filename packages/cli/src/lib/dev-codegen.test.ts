import {EventEmitter} from 'node:events';
import {PassThrough} from 'node:stream';
import {spawn} from 'node:child_process';
import {afterEach, expect, it, vi} from 'vitest';
import {spawnCodegenProcess} from './codegen.js';

vi.mock('node:child_process', async (original) => ({
  ...(await original<typeof import('node:child_process')>()),
  spawn: vi.fn(),
}));

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it('captures subprocess output and reports exit and spawn failures to the session', () => {
  vi.stubEnv('SHOPIFY_FLAG_JSON', '1');
  vi.stubEnv('SHOPIFY_FLAG_NO_INPUT', '1');
  vi.spyOn(process, 'argv', 'get').mockReturnValue([
    process.execPath,
    'shopify.js',
    'hydrogen',
    'dev',
    '--json',
  ]);
  const child = Object.assign(new EventEmitter(), {
    stdout: new PassThrough(),
    stderr: new PassThrough(),
  });
  vi.mocked(spawn).mockReturnValue(child as any);
  const onOutput = vi.fn();
  spawnCodegenProcess({rootDirectory: process.cwd(), onOutput});
  expect(spawn).toHaveBeenCalledWith(
    expect.any(String),
    expect.any(Array),
    expect.objectContaining({
      env: expect.objectContaining({
        SHOPIFY_FLAG_JSON: 'false',
        SHOPIFY_FLAG_NO_INPUT: '1',
      }),
    }),
  );
  child.stdout.write('Types generated');
  child.stderr.write('Invalid query');
  child.emit('close', 1);
  child.emit('error', new Error('Could not spawn codegen'));
  expect(onOutput).toHaveBeenCalledWith('Types generated', 'info');
  expect(onOutput).toHaveBeenCalledWith(
    expect.stringContaining('Invalid query'),
    'warning',
  );
  expect(onOutput).toHaveBeenCalledWith(
    'Codegen process exited with code 1',
    'warning',
  );
  expect(onOutput).toHaveBeenCalledWith('Could not spawn codegen', 'error');
});

it('preserves Unicode errors split across stderr chunks', () => {
  vi.stubEnv('SHOPIFY_FLAG_JSON', '1');
  const child = Object.assign(new EventEmitter(), {
    stdout: new PassThrough(),
    stderr: new PassThrough(),
  });
  vi.mocked(spawn).mockReturnValue(child as any);
  const onOutput = vi.fn();
  spawnCodegenProcess({rootDirectory: process.cwd(), onOutput});
  const message = Buffer.from('é');
  child.stderr.write(message.subarray(0, 1));
  child.stderr.write(message.subarray(1));
  expect(onOutput).toHaveBeenCalledExactlyOnceWith('[Codegen] é', 'warning');
});
