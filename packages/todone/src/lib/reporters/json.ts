import type { Reporter } from "#/lib/reporter";
import { outputItemJsonSchema } from "@todone/schema";

export const jsonReporter = (): Reporter => {
  return {
    async reportFile(file) {
      console.log(
        outputItemJsonSchema.encode({ type: "file", location: file.fullPath }),
      );
    },

    async reportMatch({ url, file, position }) {
      console.log(
        outputItemJsonSchema.encode({
          type: "match",
          url,
          location: file.fullPath,
          ...position,
        }),
      );
    },

    async reportResult({ url, result }) {
      if (result) {
        console.log(
          outputItemJsonSchema.encode({ type: "result", url, ...result }),
        );
      }
    },
  };
};
