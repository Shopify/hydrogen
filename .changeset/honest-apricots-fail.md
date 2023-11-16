---
'@shopify/cli-hydrogen': patch
---

# New `h2 upgrade` command

We are introducing a new hydrogen cli `upgrade` command that:

- Makes upgrading hydrogen as easy as typing `h2 upgrade` in your terminal
- Provides a quick summary of the key `features` and `fixes` of any available
  hydrogen version(s)
- Generates a `TODO` instructions file detailing all cumulative code changes required
  to adopt a given hydrogen version
- Provides a gentle notice during development detailing when a hydrogen is outdated, as well as a quick glance into the number of hydrogen version available

## Basic use

```bash
# from the base of the project run

h2 upgrade
```

Alternatively, you can upgrade from another folder by using the `--path` flag

```bash
h2 upgrade --path /path-to-a-outdated-hydrogen-project
```

### `--version` flag

The version flag let's you upgrade to a specific release version without any further
prompts. If an invalid version is provided you will be prompted to choose a hydrogen
version via a CLI prompt

```bash
h2 upgrade --version 2023.10.0
```

### Dev upgrade notice

Simply run dev as normal

```bash
npm run dev

# or
h2 dev
```

### `---no-version-check` flag

If you want to disable the development notice, simply run

```bash
h2 dev --no-version-check
```

### `--dry-run` flag

If your are unsure about upgrading or just want to preview the TODO list of
changes to a given hydrogen version you can run

```bash
h2 upgrade --dry-run

# this will output a new .md file inside the .shopify/ folder for a given upgrade
```
