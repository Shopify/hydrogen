#!/bin/bash

protected_branch='pre-push-to-main-warning'
current_branch=$(git rev-parse --abbrev-ref HEAD)

if [ $protected_branch = $current_branch ]; then
  printf "WARNING! You're about to push to the ${protected_branch} branch. Continue?\n"
  select yn in "Yes" "No"; do
    case $yn in
      Yes ) exit 0;;
      No ) exit 1;;
    esac
  done
fi
