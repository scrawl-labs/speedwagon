import { z } from "zod";
import { MongoClient, type IndexSpecification } from "mongodb";
import { getDb } from "../mongo-client.js";

export const indexSyncSchema = z.object({
  source_uri: z.string().describe("Source MongoDB URI to copy indexes from (e.g. Atlas dev/prod)"),
  source_database: z.string().describe("Source database name"),
  collection: z.string().optional().describe("Sync a specific collection only. Omit to sync all collections"),
  dry_run: z.boolean().optional().default(true).describe("If true, only preview indexes to create without actually creating them (default: true)"),
});

export type IndexSyncInput = z.infer<typeof indexSyncSchema>;

export async function indexSync(input: IndexSyncInput): Promise<string> {
  const sourceClient = new MongoClient(input.source_uri);

  try {
    await sourceClient.connect();
    const sourceDb = sourceClient.db(input.source_database);
    const targetDb = await getDb();

    const collections = input.collection
      ? [input.collection]
      : (await sourceDb.listCollections().toArray())
          .filter((c) => !c.name.startsWith("system."))
          .map((c) => c.name);

    const report: Array<{
      collection: string;
      indexesToCreate: Array<{ name: string; key: Record<string, unknown>; options: Record<string, unknown> }>;
      skipped: string[];
    }> = [];

    for (const collName of collections) {
      const sourceIndexes = await sourceDb.collection(collName).indexes();
      const targetIndexes = await safeGetIndexes(targetDb, collName);

      const targetIndexNames = new Set(targetIndexes.map((i) => i.name));

      const indexesToCreate: Array<{ name: string; key: Record<string, unknown>; options: Record<string, unknown> }> = [];
      const skipped: string[] = [];

      for (const idx of sourceIndexes) {
        if (idx.name === "_id_") continue;

        if (targetIndexNames.has(idx.name)) {
          skipped.push(`${idx.name} (already exists)`);
          continue;
        }

        const options: Record<string, unknown> = {};
        if (idx.unique) options.unique = true;
        if (idx.sparse) options.sparse = true;
        if (idx.expireAfterSeconds !== undefined) options.expireAfterSeconds = idx.expireAfterSeconds;
        if (idx.partialFilterExpression) options.partialFilterExpression = idx.partialFilterExpression;

        indexesToCreate.push({
          name: idx.name as string,
          key: idx.key as Record<string, unknown>,
          options,
        });
      }

      if (!input.dry_run && indexesToCreate.length > 0) {
        for (const idx of indexesToCreate) {
          await targetDb.collection(collName).createIndex(idx.key as IndexSpecification, {
            name: idx.name,
            ...idx.options,
          });
        }
      }

      report.push({ collection: collName, indexesToCreate, skipped });
    }

    const totalToCreate = report.reduce((sum, r) => sum + r.indexesToCreate.length, 0);
    const totalSkipped = report.reduce((sum, r) => sum + r.skipped.length, 0);

    return JSON.stringify(
      {
        mode: input.dry_run ? "DRY_RUN (no indexes created)" : "APPLIED",
        summary: {
          collections: report.length,
          indexesToCreate: totalToCreate,
          skipped: totalSkipped,
        },
        details: report,
      },
      null,
      2
    );
  } finally {
    await sourceClient.close();
  }
}

async function safeGetIndexes(db: ReturnType<MongoClient["db"]>, collName: string) {
  try {
    return await db.collection(collName).indexes();
  } catch {
    return [];
  }
}
