import {beforeEach, expect, it, vi} from 'vitest';
import {
  inTemporaryDirectory,
  mkdir,
  readFile,
  writeFile,
} from '@shopify/cli-kit/node/fs';
import {joinPath} from '@shopify/cli-kit/node/path';
import {captureJsonOutput} from '../../tests/output.js';
import {execAsync} from './process.js';
import {watchCodegen} from './codegen.js';
import {
  codegenCommandOutputSchema,
  type CodegenWatchRecord,
} from './codegen/types.js';
import {writeWatchRecord} from './watch.js';

vi.mock('./process.js', () => ({execAsync: vi.fn()}));
beforeEach(() => {
  vi.mocked(execAsync).mockReset().mockResolvedValue({stdout: '', stderr: ''});
});

it.each(['build', 'dist'])(
  'generates real files below a %s ancestor, recovers from errors, and closes the watcher',
  async (ancestor) => {
    await inTemporaryDirectory(async (temporaryDirectory) => {
      const rootDirectory = joinPath(
        temporaryDirectory,
        ancestor,
        'storefront',
      );
      await mkdir(rootDirectory);
      const configFilePath = joinPath(rootDirectory, 'codegen.ts');
      const documentPath = joinPath(rootDirectory, 'query.graphql');
      await writeFile(documentPath, 'query Test { hello }');
      await writeFile(
        configFilePath,
        `export default {
      schema: 'type Query { hello: String }',
      documents: 'query.graphql',
      pluginLoader: async () => ({plugin: () => 'export type Generated = string;'}),
      generates: {'generated.ts': {plugins: ['fixture']}},
    };`,
      );
      const controller = new AbortController();
      const records: CodegenWatchRecord[] = [];
      const {stdout, stderr} = await captureJsonOutput(async () => {
        const running = watchCodegen(
          {rootDirectory, configFilePath},
          controller.signal,
          (record) => {
            records.push(record);
            writeWatchRecord(codegenCommandOutputSchema, record);
          },
        );
        try {
          await vi.waitFor(
            () => expect(records.at(-1)?.type).toBe('generation-completed'),
            {timeout: 10000},
          );
          expect(
            await readFile(joinPath(rootDirectory, 'generated.ts')),
          ).toContain('Generated');
          await writeFile(documentPath, 'query Test { missing }');
          await vi.waitFor(
            () => expect(records.at(-1)?.type).toBe('generation-failed'),
            {timeout: 10000},
          );
          expect(records.at(-1)).toMatchObject({
            error: {
              tryMessage: expect.stringContaining(
                'Cannot query field "missing"',
              ),
            },
          });
          await writeFile(documentPath, 'query Test { hello }');
          await vi.waitFor(
            () => expect(records.at(-1)?.type).toBe('generation-completed'),
            {timeout: 10000},
          );
        } finally {
          controller.abort();
          await running;
        }
      });
      const output = stdout
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line));
      expect(output.length).toBeGreaterThanOrEqual(6);
      expect(output.length % 2).toBe(0);
      for (let index = 0; index < output.length; index += 2) {
        expect(output[index]).toEqual({
          type: 'generation-started',
          cycle: index / 2 + 1,
        });
        expect(output[index + 1].cycle).toBe(output[index].cycle);
        expect(['generation-completed', 'generation-failed']).toContain(
          output[index + 1].type,
        );
      }
      expect(output.some(({type}) => type === 'generation-failed')).toBe(true);
      expect(output.at(-1).type).toBe('generation-completed');
      expect(output[1]).toEqual({
        type: 'generation-completed',
        cycle: 1,
        files: [
          {
            path: joinPath(rootDirectory, 'generated.ts'),
            sources: ['query.graphql'],
          },
        ],
      });
      expect(stderr).not.toContain('export type Generated');
      expect(
        vi
          .mocked(execAsync)
          .mock.calls.filter(([command]) => command.includes('--version')),
      ).toHaveLength(1);
      expect(
        vi
          .mocked(execAsync)
          .mock.calls.filter(([command]) => command.endsWith('typegen')),
      ).toHaveLength(output.length / 2);
    });
  },
);

it('keeps watching sources colocated with preset output without repeating the router probe', async () => {
  vi.mocked(execAsync).mockRejectedValue(new Error('React Router not found'));
  await inTemporaryDirectory(async (rootDirectory) => {
    const configFilePath = joinPath(rootDirectory, 'codegen.ts');
    const documentPath = joinPath(rootDirectory, 'query.graphql');
    await writeFile(documentPath, 'query Test { hello }');
    await writeFile(
      configFilePath,
      `export default {
      schema: 'type Query { hello: String }', documents: [{'query.graphql': {}}],
      pluginLoader: async () => ({plugin: () => 'export type Generated = string;'}),
      generates: {'./': {plugins: ['fixture'], preset: {
        buildGeneratesSection: (options) => [{...options, filename: options.baseOutputDir + 'types.ts'}],
      }}},
    };`,
    );
    const controller = new AbortController();
    const records: CodegenWatchRecord[] = [];
    const running = watchCodegen(
      {rootDirectory, configFilePath},
      controller.signal,
      (record) => records.push(record),
    );
    try {
      await vi.waitFor(
        () => expect(records.at(-1)?.type).toBe('generation-completed'),
        {timeout: 10000},
      );
      expect(records.at(-1)).toMatchObject({
        files: [{sources: ['query.graphql']}],
      });
      await writeFile(documentPath, 'query Test { missing }');
      await vi.waitFor(
        () => expect(records.at(-1)?.type).toBe('generation-failed'),
        {timeout: 10000},
      );
      await writeFile(documentPath, 'query Test { hello }');
      await vi.waitFor(
        () => expect(records.at(-1)?.type).toBe('generation-completed'),
        {timeout: 10000},
      );
    } finally {
      controller.abort();
      await running;
    }
    expect(execAsync).toHaveBeenCalledTimes(1);
  });
});

it('does not regenerate when output is captured inside the project', async () => {
  await inTemporaryDirectory(async (rootDirectory) => {
    const configFilePath = joinPath(rootDirectory, 'codegen.ts');
    await writeFile(
      configFilePath,
      `export default {
      schema: 'type Query { hello: String }',
      pluginLoader: async () => ({plugin: () => 'export type Generated = string;'}),
      generates: {'generated.ts': {plugins: ['fixture']}},
    };`,
    );
    const controller = new AbortController();
    const records: CodegenWatchRecord[] = [];
    const running = watchCodegen(
      {rootDirectory, configFilePath},
      controller.signal,
      (record) => records.push(record),
    );
    try {
      await vi.waitFor(
        () => expect(records.at(-1)?.type).toBe('generation-completed'),
        {timeout: 10000},
      );
      await new Promise((resolve) => setTimeout(resolve, 200));
      const initialRecordCount = records.length;
      await writeFile(
        joinPath(rootDirectory, 'cycles.jsonl'),
        records.map((record) => JSON.stringify(record)).join('\n') + '\n',
      );
      await writeFile(
        joinPath(rootDirectory, 'diagnostics.log'),
        'diagnostic\n',
      );
      await new Promise((resolve) => setTimeout(resolve, 200));
      expect(records).toHaveLength(initialRecordCount);
    } finally {
      controller.abort();
      await running;
    }
  });
});

it('awaits route type generation before writing a completed cycle or shutting down', async () => {
  await inTemporaryDirectory(async (rootDirectory) => {
    const configFilePath = joinPath(rootDirectory, 'codegen.ts');
    await writeFile(
      configFilePath,
      `export default {
      schema: 'type Query { hello: String }',
      pluginLoader: async () => ({plugin: () => 'export type Generated = string;'}),
      generates: {'generated.ts': {plugins: ['fixture']}},
    };`,
    );
    let finishTypegen!: () => void;
    const typegen = new Promise<{stdout: string; stderr: string}>((resolve) => {
      finishTypegen = () => resolve({stdout: '', stderr: ''});
    });
    vi.mocked(execAsync)
      .mockResolvedValueOnce({stdout: '', stderr: ''})
      .mockReturnValueOnce(typegen as ReturnType<typeof execAsync>);
    const controller = new AbortController();
    const records: CodegenWatchRecord[] = [];
    let stopped = false;
    const running = watchCodegen(
      {rootDirectory, configFilePath},
      controller.signal,
      (record) => records.push(record),
    ).finally(() => {
      stopped = true;
    });
    try {
      await vi.waitFor(() => expect(execAsync).toHaveBeenCalledTimes(2));
      controller.abort();
      await new Promise<void>((resolve) => setImmediate(resolve));
      expect(stopped).toBe(false);
      expect(records).toEqual([{type: 'generation-started', cycle: 1}]);
    } finally {
      controller.abort();
      finishTypegen?.();
      await running;
    }
    expect(records.at(-1)?.type).toBe('generation-completed');
  });
});
