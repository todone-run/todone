import { describe, expect, it } from "vitest";
import * as z from "zod";
import { decodeLine, FileItem, MatchItem, ResultItem } from "./v1";

// The exact lines that `todone run --json=v1` emits, taken verbatim from the
// CLI's e2e snapshot (packages/todone/test/e2e/__snapshots__/cli.test.ts.snap)
// with `<FIXTURE>` replaced by an absolute path. Deliberately duplicated: if
// either side of the v1 contract drifts, one of the two suites fails.
const LINES = {
  file: `{"type":"file","location":"/work/repo/input/example.txt"}`,
  match: `{"type":"match","url":"fixture:expired-1?date","location":"/work/repo/input/example.txt","line":1,"column":11}`,
  expiredResult: `{"type":"result","url":"fixture:expired-1?date","title":"Fixture expired-1","isExpired":true,"expirationDate":"2000-01-02T00:00:00.000Z"}`,
  freshResult: `{"type":"result","url":"fixture:fresh-1","title":"Fixture fresh-1","isExpired":false}`,
};

describe("decodeLine", () => {
  it("decodes file items", () => {
    expect(decodeLine(LINES.file)).toEqual({
      type: "file",
      location: "/work/repo/input/example.txt",
    } satisfies FileItem);
  });

  it("decodes match items with URL instances and 1-based positions", () => {
    const item = decodeLine(LINES.match) as MatchItem;

    expect(item.type).toBe("match");
    expect(item.url).toBeInstanceOf(URL);
    expect(item.url.href).toBe("fixture:expired-1?date");
    expect(item.location).toBe("/work/repo/input/example.txt");
    expect(item.line).toBe(1);
    expect(item.column).toBe(11);
  });

  it("decodes result items with Date instances", () => {
    const item = decodeLine(LINES.expiredResult) as ResultItem;

    expect(item.type).toBe("result");
    expect(item.url).toBeInstanceOf(URL);
    expect(item.url.href).toBe("fixture:expired-1?date");
    expect(item.title).toBe("Fixture expired-1");
    expect(item.isExpired).toBe(true);
    expect(item.expirationDate).toBeInstanceOf(Date);
    expect(item.expirationDate!.toISOString()).toBe("2000-01-02T00:00:00.000Z");
  });

  it("leaves an omitted expirationDate undefined", () => {
    const item = decodeLine(LINES.freshResult) as ResultItem;

    expect(item.type).toBe("result");
    expect(item.isExpired).toBe(false);
    expect(item.expirationDate).toBeUndefined();
  });

  it("passes non-JSON lines through untouched", () => {
    for (const line of [
      "::warning::no plugin handled nothing:handles-this",
      "Analysis complete:",
      '{"type":"file","location":', // truncated JSON
    ]) {
      expect(decodeLine(line)).toEqual({ type: "passthrough", line });
    }
  });

  it("throws on valid JSON that does not match the v1 schema", () => {
    for (const line of [
      `{"type":"summary","files":1}`, // unknown item type
      `{"type":"file","location":"input/example.txt"}`, // relative path
      `{"type":"result","url":"fixture:x","title":"x","isExpired":true,"expirationDate":"tomorrow"}`, // non-ISO date
      `42`, // not an object at all
    ]) {
      expect(() => decodeLine(line)).toThrowError(z.ZodError);
    }
  });
});
