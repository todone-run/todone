# @todone/github-action

A GitHub Action that runs {@link todone} on your repository and reports every `@TODO` as an annotation on the workflow run.

## Setup

The action calls the `todone` binary installed in your project, so add `todone` and your plugins as dev dependencies and create a `todone.config.ts` first (see {@link todone}).

Then add a workflow, for example `.github/workflows/todone.yaml`:

```yaml
name: Todone

on:
  schedule:
    - cron: "0 9 * * *" # Every day
  push:
    branches:
      - main

permissions:
  contents: read

jobs:
  todone:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5

      - uses: actions/setup-node@v5
        with:
          node-version: 24

      - run: npm ci

      - uses: todone-run/todone/packages/github-action@main
        env:
          GITHUB_TOKEN: ${{ github.token }} # Used by @todone/plugin-github
```

Running on a schedule is recommended, since TODOs can expire without any change to your code.

## Inputs

| Name      | Default | Description                     |
| --------- | ------- | ------------------------------- |
| `dry-run` | `false` | Run the action in dry-run mode. |

## Annotations

The action runs `todone run --json=v1` and creates one annotation per `@TODO`, pointing at the comment's file and line:

| Annotation       | Level   | When                                        |
| ---------------- | ------- | ------------------------------------------- |
| `Expired todo`   | warning | The TODO's reference has expired.           |
| `Active todo`    | notice  | The TODO is tracked but hasn't expired yet. |
| `Unmatched todo` | warning | No plugin returned a result for the TODO.   |
