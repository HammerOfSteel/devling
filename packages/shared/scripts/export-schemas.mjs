// Emits schema/<name>.json from the built schema manifest (todo.md 0.2.4).
// Runs as part of `pnpm --filter @devling/shared build` (after tsc).
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { SCHEMA_MANIFEST } from "../dist/schema-manifest.js";

const outDir = fileURLToPath(new URL("../schema/", import.meta.url));
mkdirSync(outDir, { recursive: true });

for (const { name, schema } of SCHEMA_MANIFEST) {
  const jsonSchema = z.toJSONSchema(schema, { io: "input" });
  const withMeta = {
    $comment: `devling Controller API v1 — generated from @devling/shared, do not edit by hand (todo.md 0.2.4)`,
    ...jsonSchema,
  };
  writeFileSync(`${outDir}${name}.json`, `${JSON.stringify(withMeta, null, 2)}\n`);
}

console.log(`exported ${SCHEMA_MANIFEST.length} JSON schemas → packages/shared/schema/`);
