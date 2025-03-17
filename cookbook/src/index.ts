/**
 * This file is the entry point for the cookbook CLI.
 */
import yargs from 'yargs/yargs';
import * as commands from './commands';

const cli = yargs(process.argv.slice(2))
  .command(commands.generate)
  .command(commands.render)
  .command(commands.apply)
  .command(commands.validate)
  .command(commands.regenerate)
  .command(commands.update)
  .command(commands.llms);

cli.showHelpOnFail(true).demandCommand().help().argv;
