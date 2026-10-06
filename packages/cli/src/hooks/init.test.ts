import type {Config, Hook} from '@oclif/core';
import {expect, it, vi} from 'vitest';
import hook from './init.js';

it('leaves project validation to the command lifecycle', async () => {
  const exit = vi.spyOn(process, 'exit').mockImplementation(() => {
    throw new Error('process.exit');
  });
  const context: Hook.Context = {
    config: {} as Config,
    debug: vi.fn(),
    error: vi.fn(),
    exit: vi.fn(),
    log: vi.fn(),
    warn: vi.fn(),
  };
  try {
    await hook.call(context, {
      id: 'hydrogen:build',
      argv: ['--json'],
      config: context.config,
      context,
    });
    expect(exit).not.toHaveBeenCalled();
  } finally {
    exit.mockRestore();
  }
});
