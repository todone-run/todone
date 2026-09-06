#!/usr/bin/env node
import * as core from "@actions/core";
import { parseArgs } from "node:util";
import { ActionOptionsSchema } from "./options";
import { report } from "./report";
import { runTodone, TodoneRunError } from "./runner";

try {
  const { values } = parseArgs({
    options: {
      "create-issues": { type: "boolean", default: false },
      "issue-label": { type: "string" },
    },
    strict: true,
  });

  const options = ActionOptionsSchema.parse({
    createIssues: values["create-issues"]
      ? values["issue-label"]
        ? { label: values["issue-label"] }
        : true
      : false,
  });

  const { results, counts } = await runTodone({ cwd: options.cwd });

  core.info(
    `Analysis complete: ${counts.files} files, ${counts.matches} matches, ` +
      `${counts.results} results, ${counts.expired} expired`,
  );

  await report(options, results);
} catch (error) {
  console.error(error);
  process.exitCode =
    error instanceof TodoneRunError ? (error.exitCode ?? 1) : 1;
}
