/** Used like `lines.flatMap(intercalate(separator))` */
export const intercalate =
  <T, U>(separator: U) =>
  (item: T, index: number) =>
    index === 0 ? [item] : [separator, item];
