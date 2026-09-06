# @todone/github-action

> [!NOTE]
> Internal use only. This package is not published or distributed yet.

A GitHub Action that runs the {@link todone} CLI with `--json=v1` (version-pinned NDJSON output) and reports the results as a regular program reading the CLI's output: it writes the job summary table and, optionally, keeps a set of `todone`-labeled issues in sync with the expired TODOs.

It is the standalone successor to the reporting half of `@todone/plugin-github` — the code is copied from there, while the plugin keeps working as the GitHub URL checker.

## Usage

In a workflow of this repository, after `yarn install` and building the workspace:

```yaml
- uses: ./packages/github-action
  with:
    create-issues: "true"
```

### Inputs

| Input           | Default               | Description                                                        |
| --------------- | --------------------- | ------------------------------------------------------------------ |
| `github-token`  | `${{ github.token }}` | Token used for issue sync and API rate limits (env `GITHUB_TOKEN`) |
| `create-issues` | `"false"`             | Reconcile expired TODOs against `todone`-labeled issues            |
| `issue-label`   | `"todone"`            | Label that marks issues managed by todone                          |

The program can also be run directly: `yarn todone-github-action [--create-issues] [--issue-label <label>]`. It reads the standard GitHub Actions environment (`GITHUB_TOKEN`, `GITHUB_STEP_SUMMARY`, `GITHUB_SERVER_URL`, `GITHUB_REPOSITORY`, `GITHUB_SHA`) and skips the job summary when `GITHUB_STEP_SUMMARY` is not set.
