import * as path from "node:path";
import * as z from "zod";

/**
 * The v1 NDJSON wire format emitted by `todone run --json=v1`, copied from the
 * CLI's JSON reporter but pointed the other way: this module *decodes* the
 * stream instead of encoding it.
 *
 * This schema is frozen. It must keep decoding exactly what v1 of the format
 * emits; a future revision of the format gets a new module (and a new
 * `--json=v<n>` spelling), never an edit here.
 */

const stringToURLCodec = z.codec(z.url(), z.instanceof(URL), {
  decode: (urlString) => new URL(urlString),
  encode: (url) => url.href,
});

// The CLI serializes dates through `JSON.stringify`, i.e. `Date#toISOString`.
const isoDateCodec = z.codec(z.iso.datetime(), z.date(), {
  decode: (isoString) => new Date(isoString),
  encode: (date) => date.toISOString(),
});

const AbsolutePath = z
  .string()
  .nonempty()
  .refine((str) => path.isAbsolute(str), {
    error: "Expected an absolute path",
  });

export const FileItem = z.object({
  type: z.literal("file"),
  location: AbsolutePath,
});
export type FileItem = z.output<typeof FileItem>;

export const MatchItem = z.object({
  type: z.literal("match"),
  url: stringToURLCodec,
  location: AbsolutePath,
  line: z.number().nonnegative(),
  column: z.number().nonnegative(),
});
export type MatchItem = z.output<typeof MatchItem>;

export const ResultItem = z.object({
  type: z.literal("result"),
  url: stringToURLCodec,
  title: z.string(),
  isExpired: z.boolean(),
  expirationDate: isoDateCodec.optional(),
});
export type ResultItem = z.output<typeof ResultItem>;

export const OutputItem = z.union([FileItem, MatchItem, ResultItem]);
export type OutputItem = z.output<typeof OutputItem>;

export interface PassthroughLine {
  type: "passthrough";
  line: string;
}

export type DecodedLine = OutputItem | PassthroughLine;

/**
 * Decodes one line of `todone run --json=v1` output.
 *
 * Lines that are not JSON at all are passed through untouched: plugins may
 * legally interleave plain log lines (e.g. GitHub Actions workflow commands
 * from their `warn`/`info` hooks) with the NDJSON stream. A line that *is*
 * JSON but doesn't match the v1 schema means the format drifted, and throws.
 */
export const decodeLine = (line: string): DecodedLine => {
  let json: unknown;
  try {
    json = JSON.parse(line);
  } catch {
    return { type: "passthrough", line };
  }

  // `.parse()` runs the decode direction of the codecs (string → URL/Date).
  return OutputItem.parse(json);
};
