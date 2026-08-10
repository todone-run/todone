import { Command } from "clipanion";

export class JsonCommand extends Command {
  static paths = [
    ["run", "--json"],
    ["run", "--json=v1"],
  ];

  static usage = Command.Usage({
    description: "Run todone and output NDJSON",
    details:
      "Checks the TODOs in your code and prints one JSON object per line for machine consumption. `--json=v1` pins the current output format, while `--json` is an alias for the latest version.",
    examples: [
      ["Run with NDJSON output", "$0 run --json"],
      ["Run with version-pinned NDJSON output", "$0 run --json=v1"],
    ],
  });

  execute = async () => (await import("./impl")).default(this);
}
