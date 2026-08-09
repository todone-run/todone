import { describe, expect, it, vi } from "vitest";
import { GithubPluginOptionsSchema } from "./options";

describe("GithubPluginOptionsSchema", () => {
  it("defaults to a tokenless setup", () => {
    expect(GithubPluginOptionsSchema.parse({})).toEqual({ token: undefined });
  });

  it("reads the token from the environment", () => {
    vi.stubEnv("GITHUB_TOKEN", "env-token");

    expect(GithubPluginOptionsSchema.parse({}).token).toBe("env-token");
  });

  it("prefers an explicit token over the environment", () => {
    vi.stubEnv("GITHUB_TOKEN", "env-token");

    expect(GithubPluginOptionsSchema.parse({ token: "explicit" }).token).toBe(
      "explicit",
    );
  });
});
