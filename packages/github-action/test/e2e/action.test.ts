import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { fixtureDir, runBin } from "./run-bin";

// Each test spawns the built program, which itself spawns the built todone
// CLI, which compiles the fixture's TS config with jiti on the fly — leave
// room for cold starts on slow CI machines.
const SLOW = { timeout: 60_000 };

const GITHUB_ENV = {
  GITHUB_SERVER_URL: "https://github.example",
  GITHUB_REPOSITORY: "octo/repo",
  GITHUB_SHA: "abc123",
};

const makeSummaryFile = async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "todone-action-"));
  const summaryFile = path.join(dir, "summary.html");
  await fs.writeFile(summaryFile, "");
  return summaryFile;
};

describe("todone-github-action", () => {
  it("runs the CLI and writes the job summary", SLOW, async () => {
    const dir = fixtureDir("basic");
    const summaryFile = await makeSummaryFile();

    const { stdout, stderr, exitCode } = await runBin(dir, [], {
      ...GITHUB_ENV,
      GITHUB_STEP_SUMMARY: summaryFile,
    });

    expect(stderr).toBe("");
    expect(exitCode).toBe(0);
    expect(stdout).toContain(
      "Analysis complete: 1 files, 4 matches, 3 results, 2 expired",
    );

    const summary = await fs.readFile(summaryFile, "utf8");
    expect(summary).toMatchSnapshot();

    // Spot-check the interesting cells.
    expect(summary).toContain("TODOs found");
    expect(summary).toContain("❗");
    expect(summary).toContain("⌛");
    expect(summary).toContain("2000-01-02");
    expect(summary).toContain("No expiration date");
    expect(summary).toContain("blob/abc123");
  });

  it("skips the summary outside GitHub Actions", SLOW, async () => {
    const dir = fixtureDir("basic");

    const { stdout, stderr, exitCode } = await runBin(dir, [], GITHUB_ENV);

    expect(stderr).toBe("");
    expect(exitCode).toBe(0);
    expect(stdout).toContain(
      "GITHUB_STEP_SUMMARY is not set; skipping the job summary.",
    );
  });

  it("fails without reporting when the CLI fails", SLOW, async () => {
    const dir = fixtureDir("broken");
    const summaryFile = await makeSummaryFile();

    const { stderr, exitCode } = await runBin(dir, [], {
      ...GITHUB_ENV,
      GITHUB_STEP_SUMMARY: summaryFile,
    });

    expect(exitCode).toBe(1);
    expect(stderr).toContain("todone exited with code 1");
    await expect(fs.readFile(summaryFile, "utf8")).resolves.toBe("");
  });
});
