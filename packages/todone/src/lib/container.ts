import type {
  CheckerResult,
  Plugin,
  PluginContext,
  PluginOption,
} from "#/plugin";

export class PluginError extends Error {
  constructor(pluginName: string, url: URL, cause: unknown) {
    super(`Plugin "${pluginName}" failed while checking ${url}`, { cause });
  }
}

/**
 * Holds all the plugins for a run and knows how to dispatch to them:
 * {@link PluginContainer.checkMatch} races all checkers and settles on the
 * first one to recognize the URL. It is also the shared
 * {@link PluginContext} passed to every hook, routing plugin logging to the
 * console.
 */
export class PluginContainer implements PluginContext {
  /** Thrown internally when a plugin didn't recognize a URL. */
  static readonly #UNHANDLED = Symbol("unhandled");

  readonly #plugins: readonly Plugin[];

  constructor(plugins: readonly PluginOption[]) {
    this.#plugins = (plugins as readonly Plugin[]).flat(Infinity);
  }

  warn = (message: string) => console.warn(message);

  info = (message: string) => console.info(message);

  debug = (message: string) => console.debug(message);

  checkMatch = async ({ url }: { url: URL }): Promise<CheckerResult | null> => {
    const result = await Promise.any(
      this.#plugins.map((plugin) =>
        plugin.checkMatch.call(this, { url }).then(
          (result) => {
            if (result === null) throw PluginContainer.#UNHANDLED;
            return result;
          },
          (error) => {
            throw new PluginError(plugin.name, url, error);
          },
        ),
      ),
    ).catch((error): null => {
      if (error instanceof AggregateError) {
        const realErrors = error.errors.filter(
          (e) => e !== PluginContainer.#UNHANDLED,
        );
        if (realErrors.length === 0) return null;
        else if (realErrors.length === 1) throw realErrors[0];
        else
          throw new AggregateError(
            realErrors,
            `Multiple plugins failed while checking ${url}`,
          );
      } else throw error;
    });

    return result;
  };
}
