import { defineConfig } from "lint-staged/config";

const prettier = "prettier --write --ignore-unknown";
const oxlint = "oxlint --fix";

export default defineConfig({
  "*": prettier,
  "*.{js,jsx,ts,tsx,mjs,cjs}": [oxlint, prettier],
  "yarn.lock": () => "yarn dedupe",
});
