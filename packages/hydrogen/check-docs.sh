#!/usr/bin/env bash
set -e

# Get the absolute path to the src directory.
SRC_DIR="$(git rev-parse --show-toplevel)/packages/hydrogen/src/"

# Get claude to check the docs.
claude --print "In the directory $SRC_DIR, there are .doc.ts files which match up with similarly named files that end with .ts or .tsx.\
Those .doc.ts files describe a series of examples with a description and have file paths which point to example files.\
Check that the original code referred to matches up with the examples and their description.\
Please output a list of the files, pairing their filenames with the issues found.\
Don't output anything about successes or files without any problems.\
If no issues have been found, please output 'No issues found'."