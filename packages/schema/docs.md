# @todone/schema

[Zod](https://zod.dev) schemas for the machine-readable output of {@link todone}.

Running `todone run --json=v1` emits NDJSON: one JSON object per line. This package lets you parse and validate those lines into typed objects.

## Installation

```sh
$ npm install @todone/schema # if you use npm
$ yarn add @todone/schema    # if you use yarn
$ pnpm add @todone/schema    # if you use pnpm
```

## Usage

Use `outputItemJsonSchema` to decode a raw line straight into an {@link OutputItem}:

```ts
import { outputItemJsonSchema } from "@todone/schema";
import { execa } from "execa";

for await (const line of execa({ lines: true })`todone run --json=v1`) {
  const item = outputItemJsonSchema.decode(line);

  if (item.type === "result" && item.isExpired) {
    console.log(`Expired: ${item.url.href}`);
  }
}
```

Use `safeDecode` instead of `decode` if you want to skip invalid lines rather than throw.

## Output items

Every item has a `type` discriminator:

| `type`   | Schema             | Fields                                                   |
| -------- | ------------------ | -------------------------------------------------------- |
| `file`   | `fileItemSchema`   | `location`                                               |
| `match`  | `matchItemSchema`  | `url`, `location`, `line`, `column`                      |
| `result` | `resultItemSchema` | `url`, `title`, `isExpired`, `expirationDate` (optional) |

- `location` is always an absolute path.
- `url` is decoded into a `URL` instance (and encoded back into a string).
- A `match` and its `result` share the same `url`, so you can join them to find where each result came from.

If you already have parsed JSON, use `outputItemSchema` instead of `outputItemJsonSchema`.
