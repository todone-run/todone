import { defaultConfig } from "@todone/internal-build/tsdown";

const config = defaultConfig({ entries: ["bin"] });
config.attw = false;
(config.deps ??= {}).onlyBundle = false;
config.dts = false;

export default config;
