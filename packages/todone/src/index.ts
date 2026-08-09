import type { Reporter } from "#/reporter";
import type * as t from "#/types";
import * as it from "@cprecioso/async-iterable-helpers";
import { ConfigInput, ConfigSchema } from "./lib/config";
import { PluginContainer } from "./lib/container";
import { getFiles } from "./lib/files";
import { makeFileMatcher } from "./lib/matcher";

export interface RunOptions {
  /**
   * Receives progress and results as the run advances. Omit for a silent
   * run that only returns the results.
   */
  reporter?: Reporter;
}

export const run = async (
  rawConfig: ConfigInput,
  { reporter }: RunOptions = {},
) => {
  const config = ConfigSchema.strict().decode(rawConfig);

  const container = new PluginContainer(config.plugins);

  try {
    const results = await it
      .from(getFiles(process.cwd(), config))
      .pipe(it.tap(async (file) => await reporter?.reportFile?.(file)))

      .pipe(it.flatMap(makeFileMatcher(config.keyword.pattern)))
      .pipe(it.tap(async (match) => await reporter?.reportMatch?.(match)))

      .pipe(checkMatchesDeduping(container))
      .pipe(it.tap(async (result) => await reporter?.reportResult?.(result)))

      .sink(it.toArray());

    await reporter?.reportEnd?.();

    return results;
  } catch (error) {
    await reporter?.reportEnd?.(error);
    throw error;
  }
};

export type { Reporter } from "#/reporter";

function checkMatchesDeduping(
  container: PluginContainer,
): it.PipeFn<t.Match, t.Result> {
  return async function* (matches) {
    const resultsByUrl = new Map<string, t.Result>();

    for await (const match of matches) {
      const url = match.url.toString();
      const result = resultsByUrl.get(url);

      if (result) {
        result.matches.push(match);
      } else {
        const pluginResult = await container.checkMatch({ url: match.url });
        resultsByUrl.set(url, {
          url: match.url,
          matches: [match],
          result: pluginResult,
        });
      }
    }

    yield* resultsByUrl.values();
  };
}
