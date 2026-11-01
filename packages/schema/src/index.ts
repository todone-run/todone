import * as path from "node:path";
import * as z from "zod";

const stringToURLCodec = z.codec(z.url(), z.instanceof(URL), {
  decode: (urlString) => new URL(urlString),
  encode: (url) => url.href,
});

const jsonCodec = <T extends z.ZodType>(schema: T) =>
  z.codec(z.string(), schema, {
    decode: (jsonString, ctx) => {
      try {
        return JSON.parse(jsonString);
      } catch (err: any) {
        ctx.issues.push({
          code: "invalid_format",
          format: "json",
          input: jsonString,
          message: err.message,
        });
        return z.NEVER;
      }
    },
    encode: (value) => JSON.stringify(value),
  });

export const absolutePathSchema = z
  .string()
  .nonempty()
  .refine((str) => path.isAbsolute(str), {
    error: "Expected an absolute path",
  });
export type AbsolutePath = z.infer<typeof absolutePathSchema>;

export const fileItemSchema = z.object({
  type: z.literal("file"),
  location: absolutePathSchema,
});
export type FileItem = z.infer<typeof fileItemSchema>;

export const matchItemSchema = z.object({
  type: z.literal("match"),
  url: stringToURLCodec,
  location: absolutePathSchema,
  line: z.number().nonnegative(),
  column: z.number().nonnegative(),
});
export type MatchItem = z.infer<typeof matchItemSchema>;

export const resultItemSchema = z.object({
  type: z.literal("result"),
  url: stringToURLCodec,
  title: z.string(),
  isExpired: z.boolean(),
  expirationDate: z.date().optional(),
});
export type ResultItem = z.infer<typeof resultItemSchema>;

export const outputItemSchema = z.union([
  fileItemSchema,
  matchItemSchema,
  resultItemSchema,
]);
export type OutputItem = z.infer<typeof outputItemSchema>;

export const outputItemJsonSchema = jsonCodec(outputItemSchema);
