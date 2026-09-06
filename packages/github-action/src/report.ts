import * as core from "@actions/core";
import { Octokit } from "octokit";
import type { PluginContext } from "todone/plugin";
import type * as t from "todone/types";
import type { ActionOptions } from "./options";
import { syncIssues } from "./reporter/issues/sync";
import { Column, RowData, writeSummary } from "./reporter/summary/component";

const BASE_COLUMNS = [
  "file",
  "url",
  "expired",
  "expirationDate",
] as const satisfies Column[];

const ISSUE_COLUMNS = [
  ...BASE_COLUMNS,
  "issue",
  "action",
] as const satisfies Column[];

const toRows = ({ matches, url, result }: t.Result): RowData[] =>
  matches.map((match) => ({
    match,
    url: url.toString(),
    result: result ?? undefined,
  }));

/** The logging surface the copied reporter code expects, backed by the
 * GitHub Actions toolkit. */
const pluginCtx: PluginContext = {
  warn: (message) => core.warning(message),
  info: (message) => core.info(message),
  debug: (message) => core.debug(message),
};

/**
 * Reports a run's results to GitHub: syncs issues (if enabled) and writes a
 * single job summary, gaining the issue and action columns when issue syncing
 * is on. The summary is skipped outside GitHub Actions, where
 * `GITHUB_STEP_SUMMARY` is not set.
 */
export const report = async (
  { createIssues, context, token }: ActionOptions,
  results: readonly t.Result[],
): Promise<void> => {
  if (createIssues && !token) {
    throw new Error(
      "A GitHub token is required to sync issues (`token` option or GITHUB_TOKEN env var).",
    );
  }

  if (createIssues && !context.repository) {
    throw new Error(
      "No GitHub repository configured (`context.repository` option or GITHUB_REPOSITORY env var). Can't perform GitHub issue sync.",
    );
  }

  const { rows, columns } = createIssues
    ? {
        rows: await syncIssues({
          client: new Octokit({ auth: token }),
          context,
          options: createIssues,
          pluginCtx,
          results,
        }),
        columns: ISSUE_COLUMNS,
      }
    : { rows: results.flatMap(toRows), columns: BASE_COLUMNS };

  if (process.env.GITHUB_STEP_SUMMARY) {
    await writeSummary(context, {
      heading: "TODOs found",
      columns,
      rows,
    });
  } else {
    core.info("GITHUB_STEP_SUMMARY is not set; skipping the job summary.");
  }
};
