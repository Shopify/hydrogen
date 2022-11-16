import Command from '@shopify/cli-kit/node/base-command';

export default class Hello extends Command {
  async run(): Promise<void> {
    console.log('running hello command');
  }
}
