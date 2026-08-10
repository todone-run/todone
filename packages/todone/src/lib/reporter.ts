import type * as t from "#/types";

/**
 * Receives progress and results as a run advances. All hooks are optional;
 * `reportEnd` is called exactly once at the end of the run, with the error
 * when the run failed.
 */
export interface Reporter {
  reportFile?(item: t.File): Promise<void> | void;
  reportMatch?(item: t.Match): Promise<void> | void;
  reportResult?(item: t.Result): Promise<void> | void;
  reportEnd?(error?: unknown): Promise<void> | void;
}
