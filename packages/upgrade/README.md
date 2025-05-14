@shopify/hydrogen-upgrade
=================

Upgrade Hydrogen project dependencies, preview features, fixes and breaking changes. The command also generates an instruction file for each upgrade.


[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/@shopify/hydrogen-upgrade.svg)](https://npmjs.org/package/@shopify/hydrogen-upgrade)
[![Downloads/week](https://img.shields.io/npm/dw/@shopify/hydrogen-upgrade.svg)](https://npmjs.org/package/@shopify/hydrogen-upgrade)


<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g mycli123
$ mycli123 COMMAND
running command...
$ mycli123 (--version)
mycli123/0.0.0 darwin-arm64 node-v20.12.2
$ mycli123 --help [COMMAND]
USAGE
  $ mycli123 COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`mycli123 hello PERSON`](#mycli123-hello-person)
* [`mycli123 hello world`](#mycli123-hello-world)
* [`mycli123 help [COMMAND]`](#mycli123-help-command)
* [`mycli123 plugins`](#mycli123-plugins)
* [`mycli123 plugins add PLUGIN`](#mycli123-plugins-add-plugin)
* [`mycli123 plugins:inspect PLUGIN...`](#mycli123-pluginsinspect-plugin)
* [`mycli123 plugins install PLUGIN`](#mycli123-plugins-install-plugin)
* [`mycli123 plugins link PATH`](#mycli123-plugins-link-path)
* [`mycli123 plugins remove [PLUGIN]`](#mycli123-plugins-remove-plugin)
* [`mycli123 plugins reset`](#mycli123-plugins-reset)
* [`mycli123 plugins uninstall [PLUGIN]`](#mycli123-plugins-uninstall-plugin)
* [`mycli123 plugins unlink [PLUGIN]`](#mycli123-plugins-unlink-plugin)
* [`mycli123 plugins update`](#mycli123-plugins-update)

## `mycli123 hello PERSON`

Say hello

```
USAGE
  $ mycli123 hello PERSON -f <value>

ARGUMENTS
  PERSON  Person to say hello to

FLAGS
  -f, --from=<value>  (required) Who is saying hello

DESCRIPTION
  Say hello

EXAMPLES
  $ mycli123 hello friend --from oclif
  hello friend from oclif! (./src/commands/hello/index.ts)
```

_See code: [src/commands/hello/index.ts](https://github.com/mdonnalley/mycli123/blob/v0.0.0/src/commands/hello/index.ts)_

## `mycli123 hello world`

Say hello world

```
USAGE
  $ mycli123 hello world

DESCRIPTION
  Say hello world

EXAMPLES
  $ mycli123 hello world
  hello world! (./src/commands/hello/world.ts)
```

_See code: [src/commands/hello/world.ts](https://github.com/mdonnalley/mycli123/blob/v0.0.0/src/commands/hello/world.ts)_

## `mycli123 help [COMMAND]`

Display help for mycli123.

```
USAGE
  $ mycli123 help [COMMAND...] [-n]

ARGUMENTS
  COMMAND...  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for mycli123.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v6.0.21/src/commands/help.ts)_

## `mycli123 plugins`

List installed plugins.

```
USAGE
  $ mycli123 plugins [--json] [--core]

FLAGS
  --core  Show core plugins.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List installed plugins.

EXAMPLES
  $ mycli123 plugins
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.0.16/src/commands/plugins/index.ts)_

## `mycli123 plugins add PLUGIN`

Installs a plugin into mycli123.

```
USAGE
  $ mycli123 plugins add PLUGIN... [--json] [-f] [-h] [-s | -v]

ARGUMENTS
  PLUGIN...  Plugin to install.

FLAGS
  -f, --force    Force npm to fetch remote resources even if a local copy exists on disk.
  -h, --help     Show CLI help.
  -s, --silent   Silences npm output.
  -v, --verbose  Show verbose npm output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into mycli123.

  Uses bundled npm executable to install plugins into /Users/mdonnalley/.local/share/mycli123

  Installation of a user-installed plugin will override a core plugin.

  Use the MYCLI123_NPM_LOG_LEVEL environment variable to set the npm loglevel.
  Use the MYCLI123_NPM_REGISTRY environment variable to set the npm registry.

ALIASES
  $ mycli123 plugins add

EXAMPLES
  Install a plugin from npm registry.

    $ mycli123 plugins add myplugin

  Install a plugin from a github url.

    $ mycli123 plugins add https://github.com/someuser/someplugin

  Install a plugin from a github slug.

    $ mycli123 plugins add someuser/someplugin
```

## `mycli123 plugins:inspect PLUGIN...`

Displays installation properties of a plugin.

```
USAGE
  $ mycli123 plugins inspect PLUGIN...

ARGUMENTS
  PLUGIN...  [default: .] Plugin to inspect.

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Displays installation properties of a plugin.

EXAMPLES
  $ mycli123 plugins inspect myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.0.16/src/commands/plugins/inspect.ts)_

## `mycli123 plugins install PLUGIN`

Installs a plugin into mycli123.

```
USAGE
  $ mycli123 plugins install PLUGIN... [--json] [-f] [-h] [-s | -v]

ARGUMENTS
  PLUGIN...  Plugin to install.

FLAGS
  -f, --force    Force npm to fetch remote resources even if a local copy exists on disk.
  -h, --help     Show CLI help.
  -s, --silent   Silences npm output.
  -v, --verbose  Show verbose npm output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into mycli123.

  Uses bundled npm executable to install plugins into /Users/mdonnalley/.local/share/mycli123

  Installation of a user-installed plugin will override a core plugin.

  Use the MYCLI123_NPM_LOG_LEVEL environment variable to set the npm loglevel.
  Use the MYCLI123_NPM_REGISTRY environment variable to set the npm registry.

ALIASES
  $ mycli123 plugins add

EXAMPLES
  Install a plugin from npm registry.

    $ mycli123 plugins install myplugin

  Install a plugin from a github url.

    $ mycli123 plugins install https://github.com/someuser/someplugin

  Install a plugin from a github slug.

    $ mycli123 plugins install someuser/someplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.0.16/src/commands/plugins/install.ts)_

## `mycli123 plugins link PATH`

Links a plugin into the CLI for development.

```
USAGE
  $ mycli123 plugins link PATH [-h] [--install] [-v]

ARGUMENTS
  PATH  [default: .] path to plugin

FLAGS
  -h, --help          Show CLI help.
  -v, --verbose
      --[no-]install  Install dependencies after linking the plugin.

DESCRIPTION
  Links a plugin into the CLI for development.
  Installation of a linked plugin will override a user-installed or core plugin.

  e.g. If you have a user-installed or core plugin that has a 'hello' command, installing a linked plugin with a 'hello'
  command will override the user-installed or core plugin implementation. This is useful for development work.


EXAMPLES
  $ mycli123 plugins link myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.0.16/src/commands/plugins/link.ts)_

## `mycli123 plugins remove [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ mycli123 plugins remove [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ mycli123 plugins unlink
  $ mycli123 plugins remove

EXAMPLES
  $ mycli123 plugins remove myplugin
```

## `mycli123 plugins reset`

Remove all user-installed and linked plugins.

```
USAGE
  $ mycli123 plugins reset [--hard] [--reinstall]

FLAGS
  --hard       Delete node_modules and package manager related files in addition to uninstalling plugins.
  --reinstall  Reinstall all plugins after uninstalling.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.0.16/src/commands/plugins/reset.ts)_

## `mycli123 plugins uninstall [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ mycli123 plugins uninstall [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ mycli123 plugins unlink
  $ mycli123 plugins remove

EXAMPLES
  $ mycli123 plugins uninstall myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.0.16/src/commands/plugins/uninstall.ts)_

## `mycli123 plugins unlink [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ mycli123 plugins unlink [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ mycli123 plugins unlink
  $ mycli123 plugins remove

EXAMPLES
  $ mycli123 plugins unlink myplugin
```

## `mycli123 plugins update`

Update installed plugins.

```
USAGE
  $ mycli123 plugins update [-h] [-v]

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Update installed plugins.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.0.16/src/commands/plugins/update.ts)_
<!-- commandsstop -->
