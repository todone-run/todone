import pkg from "#/package.json" with { type: "json" };
import { commandLine, lineBreak, message, text } from "@optique/core/message";
import { commandsFromModules, runProgram } from "@optique/discover";
import { intercalate } from "./util/array";

export const main = () =>
  runProgram({
    commands: commandsFromModules(
      import.meta.glob("./commands/**/*.ts", {
        eager: true,
        import: "default",
      }),
      { base: "./commands", extensions: [".ts"] },
    ),
    metadata: {
      name: pkg.name,
      version: pkg.version,
      author: message`${text(pkg.author)}`,
      brief: [text(pkg.description)],
      examples: [
        "todone run",
        "todone run --only-expired",
        "todone run --unhandled-urls warn",
        "todone run --json=v1",
        "todone run --check",
      ]
        .map((example) => commandLine(example))
        .flatMap(intercalate(lineBreak())),
    },

    completion: { command: { hidden: true } },
    help: { option: { names: ["-h", "--help"] } },
    version: {
      value: pkg.version,
      option: { names: ["-v", "--version"], hidden: "usage" },
    },
    showChoices: true,
    showDefault: true,
  });
