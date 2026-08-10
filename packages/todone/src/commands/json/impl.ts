import { run } from "#/index";
import { jsonReporter } from "#/lib/reporters/json";
import { loadConfigFile } from "../../lib/config";
import { JsonCommand } from "./index";

export default async (_: JsonCommand) => {
  const config = await loadConfigFile();
  await run(config, { reporter: jsonReporter() });
};
