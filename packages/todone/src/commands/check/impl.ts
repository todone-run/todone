import { run } from "#/index";
import { loadConfigFile } from "../../lib/config";
import { CheckCommand } from "./index";

export default async (_: CheckCommand) => {
  const config = await loadConfigFile();
  const results = await run(config);
  return results.some((result) => result.result?.isExpired) ? 1 : 0;
};
