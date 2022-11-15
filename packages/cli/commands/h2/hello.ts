import {Command} from '@oclif/core';

export default class Hello extends Command {
  async run(): Promise<void> {
    console.log('running hello command');
  }
}
