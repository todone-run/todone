import { Octokit } from "octokit";
import type { Plugin } from "todone/plugin";
import { makeCheckerPlugin } from "./checker";
import { GithubPluginOptionsInput, GithubPluginOptionsSchema } from "./options";

/**
 * A todone plugin for GitHub.
 *
 * It checks whether the GitHub issue, pull request, or milestone a TODO
 * points at has been resolved.
 */
const githubPlugin = (inputOptions: GithubPluginOptionsInput = {}): Plugin => {
  const options = GithubPluginOptionsSchema.parse(inputOptions);

  if (!options.token) {
    process.emitWarning(
      "No GitHub token provided (`token` option or GITHUB_TOKEN env var). " +
        "Public repositories will still work, but private repositories and " +
        "higher rate limits require a token.",
      { code: "TODONE_GITHUB_NO_TOKEN" },
    );
  }

  const client = new Octokit(options.token ? { auth: options.token } : {});

  return makeCheckerPlugin(client);
};

export default githubPlugin;
