// In CI (and on a developer machine) a GITHUB_TOKEN may be exported. The
// `token` option reads it when the plugin options are parsed, and the
// no-token tests need it absent — scrub it before any test runs.
delete process.env["GITHUB_TOKEN"];
