// In CI these are all set for real (GITHUB_STEP_SUMMARY points at the actual
// job summary, GITHUB_REPOSITORY/GITHUB_SHA feed the option prefaults), and on
// a developer machine a GITHUB_TOKEN may be exported. Scrub them before any
// test module is imported so every test starts from a clean environment.
for (const name of [
  "GITHUB_ACTIONS",
  "GITHUB_TOKEN",
  "GITHUB_REPOSITORY",
  "GITHUB_SERVER_URL",
  "GITHUB_SHA",
  "GITHUB_STEP_SUMMARY",
]) {
  delete process.env[name];
}
