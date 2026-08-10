import { cliReporter } from "#/lib/reporters/cli";
import type * as t from "#/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

const makeResult = (
  url: string,
  result: t.Result["result"],
  positions: [line: number, column: number][] = [[1, 1]],
): t.Result => ({
  url: new URL(url),
  matches: positions.map(([line, column]) => ({
    url: new URL(url),
    file: { localPath: "input.txt", fullPath: "/fixture/input.txt" },
    position: { line, column },
  })),
  result,
});

let log: ReturnType<typeof vi.spyOn>;
let warn: ReturnType<typeof vi.spyOn>;
let error: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  log = vi.spyOn(console, "log").mockImplementation(() => {});
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  error = vi.spyOn(console, "error").mockImplementation(() => {});
});

const logged = () => (log.mock.calls as unknown[][]).map(([line]) => line);

describe("cliReporter unhandled URLs", () => {
  const unhandled = makeResult("test:mystery", null, [[3, 7]]);

  it("throws an explanatory error by default", async () => {
    const reporter = cliReporter();

    await expect(reporter.reportResult!(unhandled)).rejects.toThrow(
      "No plugin returned a result for test:mystery (input.txt:3:7)",
    );
  });

  it("warns to the console with `warn`", async () => {
    const reporter = cliReporter({ unhandledUrls: "warn" });

    await reporter.reportResult!(unhandled);

    expect(warn).toHaveBeenCalledExactlyOnceWith(
      "no plugin handled test:mystery (input.txt:3:7)",
    );
    expect(logged()).toEqual([]);
  });

  it("stays silent with `ignore`", async () => {
    const reporter = cliReporter({ unhandledUrls: "ignore" });

    await reporter.reportResult!(unhandled);

    expect(warn).not.toHaveBeenCalled();
    expect(logged()).toEqual([]);
  });
});

describe("cliReporter output", () => {
  it("prints every match location, the URL, the status, and the date", async () => {
    const reporter = cliReporter({ locale: "en-US" });

    await reporter.reportResult!(
      makeResult(
        "test:expired-thing",
        {
          title: "Expired thing",
          isExpired: true,
          expirationDate: new Date("2000-01-02T00:00:00Z"),
        },
        [
          [1, 4],
          [9, 2],
        ],
      ),
    );

    expect(logged()).toEqual([
      "input.txt:1:4",
      "input.txt:9:2",
      "\ttest:expired-thing",
      "\tEXPIRED",
      "\texpired on 1/2/2000",
      "",
    ]);
  });

  it("prints future expirations as not expired", async () => {
    const reporter = cliReporter({ locale: "en-US" });

    await reporter.reportResult!(
      makeResult("test:fresh", {
        title: "Fresh thing",
        isExpired: false,
        expirationDate: new Date("2999-12-31T00:00:00Z"),
      }),
    );

    expect(logged()).toEqual([
      "input.txt:1:1",
      "\ttest:fresh",
      "\tNot expired yet",
      "\twill expire on 12/31/2999",
      "",
    ]);
  });

  it("omits the date line when there is no expiration date", async () => {
    const reporter = cliReporter();

    await reporter.reportResult!(
      makeResult("test:dateless", { title: "Dateless", isExpired: false }),
    );

    expect(logged()).toEqual([
      "input.txt:1:1",
      "\ttest:dateless",
      "\tNot expired yet",
      "",
    ]);
  });

  it("hides non-expired results when onlyExpired is set, but still counts them", async () => {
    const reporter = cliReporter({ onlyExpired: true });

    await reporter.reportResult!(
      makeResult("test:fresh", { title: "Fresh", isExpired: false }),
    );
    expect(logged()).toEqual([]);

    await reporter.reportEnd!();
    expect(logged()).toEqual([
      "Analysis complete:\n" +
        "  0 files found\n" +
        "  0 matches found\n" +
        "  1 results found\n" +
        "  0 expired results found",
    ]);
  });
});

describe("cliReporter summary", () => {
  it("counts files, matches, results, and expired results", async () => {
    const reporter = cliReporter();

    const file: t.File = { localPath: "a.txt", fullPath: "/a.txt" };
    await reporter.reportFile!(file);
    await reporter.reportFile!(file);

    const expired = makeResult("test:expired", {
      title: "Expired",
      isExpired: true,
    });
    await reporter.reportMatch!(expired.matches[0]!);
    await reporter.reportResult!(expired);

    log.mockClear();
    await reporter.reportEnd!();

    expect(logged()).toEqual([
      "Analysis complete:\n" +
        "  2 files found\n" +
        "  1 matches found\n" +
        "  1 results found\n" +
        "  1 expired results found",
    ]);
  });

  it("prints the error when the run failed", async () => {
    const reporter = cliReporter();

    await reporter.reportEnd!(new Error("kaboom"));

    expect(error).toHaveBeenCalledExactlyOnceWith("Error: Error: kaboom");
    expect(warn).not.toHaveBeenCalled();
  });
});
