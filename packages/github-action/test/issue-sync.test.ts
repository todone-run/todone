import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import type * as t from "todone/types";
import { u } from "unist-builder";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { ActionOptionsSchema } from "../src/options";
import { report } from "../src/report";
import { createIssueData } from "../src/reporter/issues/issue-data";
import * as md from "../src/reporter/util/markdown";

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const api = "https://api.github.com";

const options = () =>
  ActionOptionsSchema.parse({
    token: "test-token",
    context: { repository: "octo/repo", sha: "abc123" },
    createIssues: true,
  });

const expiredResult = (): t.Result => ({
  url: new URL("fixture:expired-1"),
  result: {
    title: "Fix everything",
    isExpired: true,
    expirationDate: new Date("2023-01-02T03:04:05Z"),
  },
  matches: [
    {
      url: new URL("fixture:expired-1"),
      position: { line: 3, column: 7 },
      file: { localPath: "src/main.ts", fullPath: "/repo/src/main.ts" },
    },
  ],
});

const freshResult = (): t.Result => ({
  url: new URL("fixture:fresh-1"),
  result: { title: "Still fine", isExpired: false },
  matches: [
    {
      url: new URL("fixture:fresh-1"),
      position: { line: 1, column: 1 },
      file: { localPath: "src/other.ts", fullPath: "/repo/src/other.ts" },
    },
  ],
});

describe("report with createIssues", () => {
  it("creates a labeled issue with an embedded data zone for a new expired TODO", async () => {
    const created: unknown[] = [];

    server.use(
      // The reconciler lists currently-open todone-labeled issues: none.
      http.get(`${api}/repos/octo/repo/issues`, () => HttpResponse.json([])),
      http.post(`${api}/repos/octo/repo/issues`, async ({ request }) => {
        created.push(await request.json());
        return HttpResponse.json(
          { number: 99, title: "created" },
          { status: 201 },
        );
      }),
    );

    await report(options(), [expiredResult(), freshResult()]);

    // Only the expired TODO becomes an issue; the fresh one just waits.
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({
      title: "TODO: Fix everything",
      labels: ["todone"],
    });
    const body = (created[0] as { body: string }).body;
    expect(body).toContain("todone start");
    expect(body).toContain(JSON.stringify({ todoUrl: "fixture:expired-1" }));
    expect(body).toContain("blob/abc123");
  });

  it("closes an issue whose TODO no longer shows up as expired", async () => {
    const orphanBody = md.stringify(
      u("root", [...createIssueData({ todoUrl: "fixture:gone" })]),
    );

    const comments: unknown[] = [];
    const updates: unknown[] = [];

    server.use(
      http.get(`${api}/repos/octo/repo/issues`, () =>
        HttpResponse.json([
          { number: 7, title: "TODO: gone", body: orphanBody },
        ]),
      ),
      http.post(
        `${api}/repos/octo/repo/issues/7/comments`,
        async ({ request }) => {
          comments.push(await request.json());
          return HttpResponse.json({}, { status: 201 });
        },
      ),
      http.patch(`${api}/repos/octo/repo/issues/7`, async ({ request }) => {
        updates.push(await request.json());
        return HttpResponse.json({ number: 7, title: "TODO: gone" });
      }),
    );

    await report(options(), []);

    expect(comments).toEqual([
      {
        body: expect.stringContaining(
          "does not appear in the codebase anymore",
        ) as string,
      },
    ]);
    expect(updates).toEqual([{ state: "closed", state_reason: "completed" }]);
  });
});

describe("report guards", () => {
  it("requires a token to sync issues", async () => {
    const optionsWithoutToken = ActionOptionsSchema.parse({
      context: { repository: "octo/repo" },
      createIssues: true,
    });

    await expect(report(optionsWithoutToken, [])).rejects.toThrow(
      /GitHub token is required/,
    );
  });

  it("requires a repository to sync issues", async () => {
    const optionsWithoutRepository = ActionOptionsSchema.parse({
      token: "test-token",
      createIssues: true,
    });

    await expect(report(optionsWithoutRepository, [])).rejects.toThrow(
      /No GitHub repository configured/,
    );
  });
});
