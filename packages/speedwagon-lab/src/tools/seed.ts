import { z } from "zod";
import { faker } from "@faker-js/faker";
import { getRawDb } from "../raw-client.js";

export const seedSchema = z.object({
  collection: z.string().describe("Collection name to seed (will be created if it doesn't exist)"),
  count: z
    .number()
    .int()
    .min(1)
    .max(100_000)
    .describe("Number of documents to insert (max 100,000 per call; call multiple times for larger sets)"),
  schema: z
    .string()
    .describe(
      'JSON schema mapping field name to value definition. ' +
        'Use {"type": "<faker.path>", "args"?: {...}} for faker, or {"static": <value>} for fixed values. ' +
        'Example: {"email": {"type": "internet.email"}, "age": {"type": "number.int", "args": {"min": 18, "max": 80}}, "status": {"static": "active"}}'
    ),
  batchSize: z
    .number()
    .int()
    .min(100)
    .max(10_000)
    .optional()
    .default(1000)
    .describe("insertMany batch size (default 1000)"),
});

export type SeedInput = z.infer<typeof seedSchema>;

interface FieldDef {
  type?: string;
  args?: Record<string, unknown>;
  static?: unknown;
}

export async function seed(input: SeedInput): Promise<string> {
  const db = await getRawDb();
  const collection = db.collection(input.collection);

  const schemaObj = JSON.parse(input.schema) as Record<string, FieldDef>;

  const resolvers: Record<string, () => unknown> = {};
  for (const [field, def] of Object.entries(schemaObj)) {
    resolvers[field] = buildResolver(field, def);
  }

  const startedAt = Date.now();
  let inserted = 0;
  let batch: Record<string, unknown>[] = [];

  for (let i = 0; i < input.count; i++) {
    const doc: Record<string, unknown> = {};
    for (const [field, resolver] of Object.entries(resolvers)) {
      doc[field] = resolver();
    }
    batch.push(doc);

    if (batch.length >= input.batchSize) {
      await collection.insertMany(batch);
      inserted += batch.length;
      batch = [];
    }
  }
  if (batch.length > 0) {
    await collection.insertMany(batch);
    inserted += batch.length;
  }

  const elapsedMs = Date.now() - startedAt;

  return JSON.stringify(
    {
      collection: input.collection,
      inserted,
      elapsedMs,
      docsPerSecond: elapsedMs > 0 ? Math.round((inserted / elapsedMs) * 1000) : inserted,
    },
    null,
    2
  );
}

function buildResolver(fieldName: string, def: FieldDef): () => unknown {
  if (def.static !== undefined) {
    const value = def.static;
    return () => value;
  }
  if (!def.type) {
    throw new Error(`Field "${fieldName}": must specify either "type" or "static".`);
  }

  const fakerFn = resolveFakerPath(def.type);
  if (typeof fakerFn !== "function") {
    throw new Error(`Field "${fieldName}": faker path "${def.type}" is not callable.`);
  }

  const parts = def.type.split(".");
  const parent = parts
    .slice(0, -1)
    .reduce<Record<string, unknown> | undefined>(
      (obj, p) => (obj?.[p] as Record<string, unknown> | undefined),
      faker as unknown as Record<string, unknown>
    );

  if (def.args) {
    const args = def.args;
    return () => (fakerFn as (a: unknown) => unknown).call(parent, args);
  }
  return () => (fakerFn as () => unknown).call(parent);
}

function resolveFakerPath(path: string): unknown {
  const parts = path.split(".");
  let obj: unknown = faker;
  for (const p of parts) {
    if (typeof obj !== "object" || obj === null) {
      throw new Error(`Unknown faker path: "${path}"`);
    }
    obj = (obj as Record<string, unknown>)[p];
    if (obj === undefined) {
      throw new Error(`Unknown faker path: "${path}"`);
    }
  }
  return obj;
}
