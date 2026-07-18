/** Protocol wire version. Bumped only on breaking envelope changes (todo.md §5.1). */
export const PROTOCOL_VERSION = 1 as const;

export const PACKAGE_NAME = "@devling/shared";

export * from "./protocol.js";
export * from "./envelope.js";
export * from "./mapping.js";
export * from "./schema-manifest.js";
