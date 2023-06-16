import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  SpyInstance,
} from 'vitest';
import {Config} from '@oclif/core';
import {Deploy as OxygenDeploy} from '@shopify/oxygen-cli/dist/commands/oxygen/deploy.js';

import {Deploy as HydrogenDeploy} from './deploy.js';
import {getOxygenDeploymentToken} from '../../lib/get-oxygen-token.js';

vi.mock('../../../src/lib/get-oxygen-token');

describe('deploy', () => {
  let spy: SpyInstance;

  beforeEach(() => {
    spy = vi.spyOn(OxygenDeploy.prototype, 'run');
    const mockRun = async (argv?: string[], opts?: any): Promise<any> => {};
    spy.mockImplementation(mockRun);
  });

  afterEach(() => {
    spy.mockRestore();
  });

  it('calls getOxygenDeploymentToken with the correct parameters', async () => {
    const config = await Config.load();
    const deploy = new HydrogenDeploy([], config);
    deploy.argv = ['--shop', 'snowdevil'];
    await deploy.run();

    expect(getOxygenDeploymentToken).toHaveBeenCalledWith({
      root: './',
      flagShop: 'snowdevil.myshopify.com',
    });
  });

  it('pushes the token to argv if not provided with a flag', async () => {
    vi.mocked(getOxygenDeploymentToken).mockResolvedValueOnce('a-nice-token');
    const config = await Config.load();
    const deploy = new HydrogenDeploy([], config);
    deploy.argv = ['--shop', 'snowdevil'];
    await deploy.run();

    expect(spy).toBeCalled;
    expect(deploy.argv).toContain('--token');
    expect(deploy.argv).toContain('a-nice-token');
  });
});
