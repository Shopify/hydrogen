import {Flags} from '@oclif/core';
import {Deploy} from '@shopify/oxygen-cli/dist/commands/oxygen/deploy.js';

import {commonFlags} from '../../lib/flags.js';
import {getOxygenDeploymentToken} from '../../lib/get-oxygen-token.js';

type OriginalFlagsType = typeof Deploy.flags;

interface ExtendedFlags extends OriginalFlagsType {
  shop: ReturnType<typeof Flags.string>;
}

class HydrogenDeploy extends Deploy {
  static flags: ExtendedFlags = {
    ...Deploy.flags,
    shop: commonFlags.shop,
  };

  async run() {
    const {flags} = await this.parse(HydrogenDeploy);
    const actualPath = flags.path ?? process.cwd();

    if (!flags.token) {
      const token = await getOxygenDeploymentToken({
        root: actualPath,
        flagShop: flags.shop,
      });

      if (token) this.argv.push('--token', token as string);
    }

    return super.run();
  }
}

export {HydrogenDeploy as Deploy};
