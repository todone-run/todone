import { spawn } from "node:child_process";
import * as path from "node:path";
import * as readline from "node:readline";
import type * as t from "todone/types";
import { decodeLine, MatchItem, ResultItem } from "./ndjson/v1";
import { resolveTodoneBin } from "./todone-bin";

export interface RunCounts {
  files: number;
  matches: number;
  results: number;
  expired: number;
}

export interface RunOutcome {
  results: t.Result[];
  counts: RunCounts;
}

/** The todone CLI exited with a non-zero code (or was killed by a signal). */
export class TodoneRunError extends Error {
  override name = "TodoneRunError";

  constructor(public readonly exitCode: number | null) {
    super(
      exitCode === null
        ? "todone was killed by a signal"
        : `todone exited with code ${exitCode}`,
    );
  }
}

/**
 * Spawns `todone run --json=v1` in `cwd` and decodes its NDJSON output back
 * into {@link t.Result}s.
 *
 * The environment is passed through so the CLI sees the same GitHub context
 * (e.g. `GITHUB_TOKEN` for checker plugins). Its stderr streams straight to
 * ours, and non-JSON stdout lines (plugin log output) are re-printed so
 * workflow-command annotations survive. `localPath` is recomputed as
 * `path.relative(cwd, location)`, exactly how the CLI derives it.
 *
 * The CLI exits 0 even when expired TODOs exist, so a non-zero exit means a
 * real failure and throws {@link TodoneRunError} without reporting partial
 * output.
 */
export const runTodone = async ({
  cwd = process.cwd(),
}: {
  cwd?: string;
} = {}): Promise<RunOutcome> => {
  const bin = await resolveTodoneBin();

  const child = spawn(process.execPath, [bin, "run", "--json=v1"], {
    cwd,
    env: process.env,
    stdio: ["ignore", "pipe", "inherit"],
  });

  const exited = new Promise<number | null>((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code) => resolve(code));
  });

  const counts: RunCounts = { files: 0, matches: 0, results: 0, expired: 0 };
  const matchesByUrl = new Map<string, MatchItem[]>();
  const resultItems: ResultItem[] = [];

  const lines = readline.createInterface({
    input: child.stdout,
    crlfDelay: Infinity,
  });

  try {
    for await (const line of lines) {
      if (!line) continue;

      const item = decodeLine(line);
      switch (item.type) {
        case "passthrough": {
          console.log(item.line);
          break;
        }

        case "file": {
          counts.files += 1;
          break;
        }

        case "match": {
          counts.matches += 1;
          const matches = matchesByUrl.get(item.url.href) ?? [];
          matches.push(item);
          matchesByUrl.set(item.url.href, matches);
          break;
        }

        case "result": {
          counts.results += 1;
          if (item.isExpired) counts.expired += 1;
          resultItems.push(item);
          break;
        }
      }
    }
  } catch (error) {
    child.kill();
    throw error;
  }

  const exitCode = await exited;
  if (exitCode !== 0) throw new TodoneRunError(exitCode);

  const results = resultItems.map(({ type: _, url, ...result }): t.Result => {
    const matches = matchesByUrl.get(url.href) ?? [];
    return {
      url,
      result,
      matches: matches.map((match): t.Match => ({
        url: match.url,
        position: { line: match.line, column: match.column },
        file: {
          fullPath: match.location,
          localPath: path.relative(cwd, match.location),
        },
      })),
    };
  });

  return { results, counts };
};
