import { run } from "#/index";
import { loadConfigFile } from "#/lib/config";
import type { UnhandledUrls } from "#/lib/reporters/cli";
import { cliReporter } from "#/lib/reporters/cli";
import { jsonReporter } from "#/lib/reporters/json";
import {
  choice,
  constant,
  flag,
  object,
  option,
  or,
  string,
} from "@optique/core";
import { message, optionName } from "@optique/core/message";
import { defineCommand } from "@optique/discover/command";

const unhandledUrls = [
  "error",
  "warn",
  "ignore",
] as const satisfies readonly UnhandledUrls[];

const cliParser = object({
  mode: constant("human"),
  onlyExpired: flag("--only-expired", {
    description: message`Only print expired results.`,
  }).withDefault(false),

  locale: option("--locale", string({ metavar: "LOCALE" }), {
    description: message`Locale used to format dates; defaults to the system locale.`,
  }).optional(),

  unhandledUrls: option("--unhandled-urls", choice(unhandledUrls), {
    description: message`What to do when no plugin returns a result for a URL.`,
  }).withDefault("error"),
});

const checkParser = object({
  mode: constant("check"),
  _: flag("--check", {
    description: message`Print nothing and exit with code 1 if any TODO is expired, 0 otherwise.`,
  }),
});

const jsonParser = object({
  mode: constant("json"),
  _: option("--json", choice(["v1"], { metavar: "VERSION" }), {
    description: message`Print one JSON object per line (NDJSON) for machine consumption.`,
  }),
});

// `or()` needs at least one token to pick a branch, so fall back to the
// default human-readable output when no options are given.
const parser = or(cliParser, checkParser, jsonParser).withDefault({
  mode: "human",
  onlyExpired: false,
  locale: undefined,
  unhandledUrls: "error",
});

export default defineCommand({
  parser,

  metadata: {
    brief: message`Run the todone CLI`,
    description: message`Checks the TODOs in your code and prints human-readable output. Use ${optionName("--json=v1")} instead for NDJSON output, or ${optionName("--check")} to only report through the exit code.`,
  },

  async handler(args) {
    const config = await loadConfigFile();

    switch (args.mode) {
      case "human": {
        const { onlyExpired, locale, unhandledUrls } = args;
        await run(config, {
          reporter: cliReporter({ onlyExpired, locale, unhandledUrls }),
        });
        return;
      }
      case "check": {
        const results = await run(config);
        process.exitCode = results.some((result) => result.result?.isExpired)
          ? 1
          : 0;
        return;
      }
      case "json": {
        await run(config, { reporter: jsonReporter() });
        return;
      }
      default:
        args satisfies never;
        throw new Error(`Unknown mode`);
    }
  },
});
