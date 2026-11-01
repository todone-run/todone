#!/usr/bin/env node

import * as core from "@actions/core";
import * as it from "@cprecioso/async-iterable-helpers";
import { FileItem, OutputItem, outputItemJsonSchema } from "@todone/schema";
import { execa } from "execa";

async function main() {
  const lines = execa({
    lines: true,
    preferLocal: true,
  })`todone run --json=v1`;

  const items = await it
    .from(lines)
    .pipe(
      it.filterMap(
        (line) => outputItemJsonSchema.safeDecode(line).data ?? null,
      ),
    )
    .pipe(
      it.filter(
        (item): item is Exclude<OutputItem, FileItem> => item.type !== "file",
      ),
    )
    .sink(it.groupObjectByKey("type"));

  const resultsByUrl = new Map(
    items.result?.map((result) => [result.url.toString(), result] as const),
  );
  const matches =
    items.match?.map((match) => ({
      match,
      result: resultsByUrl.get(match.url.toString()),
    })) ?? [];

  for (const { result, match } of matches) {
    const properties: core.AnnotationProperties = {
      file: match.location,
      startLine: match.line,
      startColumn: match.column,
    };

    if (result) {
      if (result.isExpired) {
        core.warning(`Expired result for ${match.url.toString()}`, {
          title: "Expired todo",
          ...properties,
        });
      } else {
        core.notice(`Tracking todo for ${match.url.toString()}`, {
          title: "Active todo",
          ...properties,
        });
      }
    } else {
      core.warning(`No result for ${match.url.toString()}`, {
        title: "Unmatched todo",
        ...properties,
      });
    }
  }
}

await main();
