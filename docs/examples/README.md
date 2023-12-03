# Contributing Hydrogen examples

Hydrogen is an open source project, and we welcome your contributions! Sharing examples is a great way to showcase Hydrogen's full range of capabilities. Examples are also the best way to demonstrate third-party integrations that aren’t a natural fit for Shopify’s official documentation.

## Project structure

An example project should provide the minimal functionality necessary to illustrate the concept.

### Baseline functionality

- Always use Hydrogen's [Skeleton template](/templates/skeleton) as the baseline for examples.
- Only include the files that are required to illustrate the example.
  - For instance, if your example requires editing the product detail page, keep the `app/routes/products.$handle.tsx` file to show your updates, but delete all other route files.
  - The goal is to maintain focus on the relevant example code, and reduce the burden of maintaining examples.

### Example folder naming

- Give the example a descriptive name.
  - Pick key words that someone is likely to search for in the page with `ctrl-F`.
  - If similar examples already exist, pick a similar naming pattern so they group alphabetically.
- Use `kebab-case`.
- Use lowercase letters only.

### Language

- Default to TypeScript
  - Types provide a measure of self-documentation for examples, cutting down on verbosity and redundant code comments.
  - It’s easier to remove or omit unneeded types than to add them in later.

### Comments

- Use code comments strategically throughout the example. Less is more.
- Use [JSDoc](https://jsdoc.app/) syntax to document functions.
- Opt for more descriptive function and variable names to cut down on redundant comments explaining what they do.
- Use comments to highlight common mistakes, resolve ambiguity, or explain non-obvious context.

## README

Every example needs a README file that explains what it does and how it works. Each README should follow this guideline and include the following sections:

### Introduction

- Provide a few sentences that explain what the example illustrates.
- Keep it short, descriptive, and factual.

### Requirements

- Provide a point-form list of anything you’ll need before you start.
  - Examples: account logins, third-party API tokens, feature access, beta flags, etc.
- If the example integrates a third-party service, link to the relevant docs.
  - The goal isn't to document that other platform; select links that focus on completing the task at hand.

### Key files

A table listing the relevant files makes it easier to quickly scan the example and understand its complexity.

- Provide a table with the list of files the user will need to create or edit.
  - Start with new files that you need to create, then files that require editing.
  - Prefix newly created files with the 🆕 emoji.
  - Link the file name to the actual file in the example codebase.
  - Add a brief description of the file's purpose.
- If the example requires environment variables, document them in a `.env.example` file.

### Instructions

- In general, use the file list above as the order of operations.
  1. Handle creating new files first.
  1. Then describe updates and edits to existing Hydrogen default files.
- Ideally, structure the instructions so the user touches each file once, instead of returning to files multiple times across different steps. This way, the list of files serves as both a table of contents and a TODO list for the developer.
