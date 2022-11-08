#!/bin/bash

protected_branch='main'
current_branch=$(git rev-parse --abbrev-ref HEAD)

if read local_ref local_sha remote_ref remote_sha && [ $protected_branch = $current_branch ]; then
  printf "\033[1;91mWARNING! You're about to push to the ${protected_branch} branch. Continue? [y|n]\033[0m\n"
  read -n 1 -r < /dev/tty
  echo
  if echo $REPLY | grep -E '^[Yy]$' > /dev/null; then
    exit 0
  fi
  exit 1
fi
