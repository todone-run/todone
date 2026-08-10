import { run } from "#/index";
import { cliReporter } from "#/lib/reporters/cli";
import { loadConfigFile } from "../../lib/config";
import { RunCommand } from "./index";

export default async ({ onlyExpired, locale, unhandledUrls }: RunCommand) => {
  const config = await loadConfigFile();

  await run(config, {
    reporter: cliReporter({ onlyExpired, locale, unhandledUrls }),
  });
};
