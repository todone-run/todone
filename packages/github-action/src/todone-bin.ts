import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Resolves the absolute path of the `todone` CLI entry point from this
 * package's own `todone` dependency, so the action always runs the CLI
 * version it was built against.
 */
export const resolveTodoneBin = async (): Promise<string> => {
  const pkgJsonPath = fileURLToPath(import.meta.resolve("todone/package.json"));
  const pkg = JSON.parse(await fs.readFile(pkgJsonPath, "utf8")) as {
    bin?: string | Record<string, string | undefined>;
  };

  const bin =
    typeof pkg.bin === "string"
      ? pkg.bin
      : (pkg.bin?.["todone"] ?? Object.values(pkg.bin ?? {}).at(0));

  if (!bin) {
    throw new Error(`No bin entry found in ${pkgJsonPath}`);
  }

  return path.resolve(path.dirname(pkgJsonPath), bin);
};
