import {describe, it, expect, vi, beforeEach} from 'vitest';
import {setupTemplate} from './index.js';
import {setupLocalStarterTemplate} from './local.js';
import {setupRemoteTemplate} from './remote.js';
import {setupVersionedTemplate} from './versioned.js';

vi.mock('./local.js', () => ({
  setupLocalStarterTemplate: vi.fn(),
}));

vi.mock('./remote.js', () => ({
  setupRemoteTemplate: vi.fn(),
}));

vi.mock('./versioned.js', () => ({
  setupVersionedTemplate: vi.fn(),
}));

describe('setupTemplate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call setupVersionedTemplate when version is provided without template', async () => {
    const mockResult = {name: 'test-project', directory: '/tmp/test'} as any;
    vi.mocked(setupVersionedTemplate).mockResolvedValue(mockResult);

    const options = {
      version: '2025.1.1',
    };

    const result = await setupTemplate(options);

    expect(setupVersionedTemplate).toHaveBeenCalledWith(
      options,
      expect.any(Object), // AbortController
    );
    expect(setupLocalStarterTemplate).not.toHaveBeenCalled();
    expect(setupRemoteTemplate).not.toHaveBeenCalled();
    expect(result).toBe(mockResult);
  });

  it('should not call setupVersionedTemplate when both version and template are provided', async () => {
    const mockResult = {name: 'test-project', directory: '/tmp/test'} as any;
    vi.mocked(setupRemoteTemplate).mockResolvedValue(mockResult);

    const options = {
      version: '2025.1.1',
      template: 'custom-template',
    };

    const result = await setupTemplate(options);

    expect(setupVersionedTemplate).not.toHaveBeenCalled();
    expect(setupRemoteTemplate).toHaveBeenCalledWith(
      options,
      expect.any(Object), // AbortController
    );
    expect(result).toBe(mockResult);
  });

  it('should call setupLocalStarterTemplate when no template or version is provided', async () => {
    const mockResult = {name: 'test-project', directory: '/tmp/test'} as any;
    vi.mocked(setupLocalStarterTemplate).mockResolvedValue(mockResult);

    const options = {};

    const result = await setupTemplate(options);

    expect(setupVersionedTemplate).not.toHaveBeenCalled();
    expect(setupRemoteTemplate).not.toHaveBeenCalled();
    expect(setupLocalStarterTemplate).toHaveBeenCalledWith(
      options,
      expect.any(Object), // AbortController
    );
    expect(result).toBe(mockResult);
  });

  it('should call setupRemoteTemplate when template is provided without version', async () => {
    const mockResult = {name: 'test-project', directory: '/tmp/test'} as any;
    vi.mocked(setupRemoteTemplate).mockResolvedValue(mockResult);

    const options = {
      template: 'hello-world',
    };

    const result = await setupTemplate(options);

    expect(setupVersionedTemplate).not.toHaveBeenCalled();
    expect(setupLocalStarterTemplate).not.toHaveBeenCalled();
    expect(setupRemoteTemplate).toHaveBeenCalledWith(
      options,
      expect.any(Object), // AbortController
    );
    expect(result).toBe(mockResult);
  });

  it('should pass the same AbortController to all setup functions', async () => {
    let capturedController: any;

    vi.mocked(setupVersionedTemplate).mockImplementation(
      async (options, controller) => {
        capturedController = controller;
        return {name: 'test', directory: '/tmp/test'} as any;
      },
    );

    await setupTemplate({version: '2025.1.1'});

    expect(capturedController).toBeDefined();
    expect(capturedController).toHaveProperty('signal');
  });

  it('should propagate errors from setupVersionedTemplate', async () => {
    const error = new Error('Version setup failed');
    vi.mocked(setupVersionedTemplate).mockRejectedValue(error);

    const options = {
      version: '2025.1.1',
    };

    await expect(setupTemplate(options)).rejects.toThrow(
      'Version setup failed',
    );
  });

  it('should propagate errors from setupLocalStarterTemplate', async () => {
    const error = new Error('Local setup failed');
    vi.mocked(setupLocalStarterTemplate).mockRejectedValue(error);

    const options = {};

    await expect(setupTemplate(options)).rejects.toThrow('Local setup failed');
  });

  it('should propagate errors from setupRemoteTemplate', async () => {
    const error = new Error('Remote setup failed');
    vi.mocked(setupRemoteTemplate).mockRejectedValue(error);

    const options = {
      template: 'broken-template',
    };

    await expect(setupTemplate(options)).rejects.toThrow('Remote setup failed');
  });

  it('should handle all options passed through to versioned setup', async () => {
    const mockResult = {name: 'test-project', directory: '/tmp/test'} as any;
    vi.mocked(setupVersionedTemplate).mockResolvedValue(mockResult);

    const options = {
      version: '2025.1.1',
      path: '/tmp/test',
      quickstart: true,
      mockShop: true,
      installDeps: false,
      git: false,
      language: 'js' as const,
      i18n: 'domains' as const,
      routes: true,
      shortcut: false,
    };

    await setupTemplate(options);

    expect(setupVersionedTemplate).toHaveBeenCalledWith(
      options,
      expect.any(Object),
    );
  });
});
