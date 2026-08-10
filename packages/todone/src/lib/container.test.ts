import { PluginContainer, PluginError } from "#/lib/container";
import type { Plugin } from "#/plugin";
import type * as t from "#/types";
import { describe, expect, it, vi } from "vitest";

const url = new URL("test:some-url");

const result = (title: string): t.Result["result"] => ({
  title,
  isExpired: false,
});

const never = () => new Promise<never>(() => {});

describe("PluginContainer.checkMatch", () => {
  it("settles on the first plugin to return a result", async () => {
    const container = new PluginContainer([
      { name: "slow", checkMatch: never },
      { name: "fast", checkMatch: async () => result("fast") },
    ]);

    await expect(container.checkMatch({ url })).resolves.toEqual(
      result("fast"),
    );
  });

  it("returns null when every plugin declines the URL", async () => {
    const container = new PluginContainer([
      { name: "a", checkMatch: async () => null },
      { name: "b", checkMatch: async () => null },
    ]);

    await expect(container.checkMatch({ url })).resolves.toBeNull();
  });

  it("returns null when there are no plugins", async () => {
    const container = new PluginContainer([]);

    await expect(container.checkMatch({ url })).resolves.toBeNull();
  });

  it("wraps a single failure in a PluginError naming the plugin and URL", async () => {
    const cause = new Error("boom");
    const container = new PluginContainer([
      { name: "declines", checkMatch: async () => null },
      {
        name: "explodes",
        checkMatch: async () => {
          throw cause;
        },
      },
    ]);

    const error = await container.checkMatch({ url }).then(
      () => expect.unreachable("should have thrown"),
      (error: unknown) => error,
    );

    expect(error).toBeInstanceOf(PluginError);
    expect((error as PluginError).message).toBe(
      'Plugin "explodes" failed while checking test:some-url',
    );
    expect((error as PluginError).cause).toBe(cause);
  });

  it("aggregates multiple failures into an AggregateError", async () => {
    const throwing = (name: string): Plugin => ({
      name,
      checkMatch: async () => {
        throw new Error(name);
      },
    });
    const container = new PluginContainer([throwing("one"), throwing("two")]);

    const error = await container.checkMatch({ url }).then(
      () => expect.unreachable("should have thrown"),
      (error: unknown) => error,
    );

    expect(error).toBeInstanceOf(AggregateError);
    expect((error as AggregateError).message).toBe(
      "Multiple plugins failed while checking test:some-url",
    );
    expect((error as AggregateError).errors).toHaveLength(2);
    for (const inner of (error as AggregateError).errors) {
      expect(inner).toBeInstanceOf(PluginError);
    }
  });

  it("prefers a real result over failures from other plugins", async () => {
    const container = new PluginContainer([
      {
        name: "explodes",
        checkMatch: () => Promise.reject(new Error("boom")),
      },
      { name: "answers", checkMatch: async () => result("answers") },
    ]);

    await expect(container.checkMatch({ url })).resolves.toEqual(
      result("answers"),
    );
  });
});

describe("PluginContainer plugin handling", () => {
  it("flattens arbitrarily nested plugin options", async () => {
    const seen: string[] = [];
    const plugin = (name: string): Plugin => ({
      name,
      checkMatch: async () => {
        seen.push(name);
        return null;
      },
    });

    const container = new PluginContainer([
      plugin("a"),
      [plugin("b"), [plugin("c")]],
    ]);
    await container.checkMatch({ url });

    expect(seen.sort()).toEqual(["a", "b", "c"]);
  });

  it("routes context logging to the console", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const container = new PluginContainer([]);

    container.warn("careful");

    expect(warn).toHaveBeenCalledExactlyOnceWith("careful");
  });

  it("lets a plugin reach the shared context through `this`", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const container = new PluginContainer([
      {
        name: "complainer",
        async checkMatch() {
          this.warn("seen it");
          return null;
        },
      },
    ]);

    await container.checkMatch({ url });

    expect(warn).toHaveBeenCalledExactlyOnceWith("seen it");
  });
});
