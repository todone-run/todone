import { beforeEach, describe, expect, it, vi } from "vitest";
import githubPlugin from "./index";

let emitWarning: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  emitWarning = vi.spyOn(process, "emitWarning").mockImplementation(() => {});
});

describe("githubPlugin factory", () => {
  it("warns when no token is available but stays usable", () => {
    const plugin = githubPlugin();

    expect(emitWarning).toHaveBeenCalledOnce();
    expect(emitWarning.mock.calls[0]![1]).toMatchObject({
      code: "TODONE_GITHUB_NO_TOKEN",
    });
    expect(plugin.name).toBe("@todone/plugin-github:checker");
  });

  it("does not warn when a token is provided", () => {
    githubPlugin({ token: "test-token" });

    expect(emitWarning).not.toHaveBeenCalled();
  });
});
