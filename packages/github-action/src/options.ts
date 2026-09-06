import * as z from "zod";
import { GitHubContextSchema } from "./reporter/context";
import { CreateIssuesOptionsSchema } from "./reporter/options";

export const ActionOptionsSchema = z.object({
  /** GitHub API token. Defaults to `process.env.GITHUB_TOKEN`. */
  token: z
    .string()
    .optional()
    .prefault(() => process.env.GITHUB_TOKEN),

  /**
   * The pieces of GitHub context used to build file permalinks and issue
   * links, and to pick the repository to sync issues against. Every field
   * defaults to the standard GitHub Actions environment variable.
   */
  context: GitHubContextSchema.prefault({}),

  /**
   * Reconcile expired TODOs against the open `todone`-labeled issues, creating,
   * updating, and closing issues as needed. Requires a token.
   *
   * Defaults to `false`.
   */
  createIssues: z
    .union([
      z.literal(false),
      z
        .literal(true)
        .transform(() => ({}))
        .pipe(CreateIssuesOptionsSchema),
      CreateIssuesOptionsSchema,
    ])
    .optional()
    .prefault(false),

  /** The directory to run the todone CLI in. Defaults to the working directory. */
  cwd: z.string().prefault(() => process.cwd()),
});

export interface ActionOptions extends z.infer<typeof ActionOptionsSchema> {}

export interface ActionOptionsInput extends z.input<
  typeof ActionOptionsSchema
> {}
