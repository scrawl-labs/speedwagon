import { z } from "zod";
import { getDb } from "../client.js";
import { getDefaultEnv } from "../config.js";

export const collectionStatsSchema = z.object({
  env: z.string().optional().describe(`Target environment. Defaults to "${getDefaultEnv()}".`),
  collection: z.string().describe("Collection name"),
});

export type CollectionStatsInput = z.infer<typeof collectionStatsSchema>;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export async function collectionStats(input: CollectionStatsInput): Promise<string> {
  const { db } = await getDb(input.env);

  const stats = await db.command({ collStats: input.collection });

  const indexDetails = Object.entries(stats.indexSizes ?? {}).map(([name, size]) => ({
    name,
    size: formatBytes(size as number),
    sizeBytes: size,
  }));

  return JSON.stringify({
    environment: input.env || getDefaultEnv(),
    collection: input.collection,
    documentCount: stats.count,
    avgDocSize: formatBytes(stats.avgObjSize ?? 0),
    dataSize: formatBytes(stats.size ?? 0),
    storageSize: formatBytes(stats.storageSize ?? 0),
    totalIndexSize: formatBytes(stats.totalIndexSize ?? 0),
    indexCount: stats.nindexes,
    indexes: indexDetails,
    capped: stats.capped ?? false,
  }, null, 2);
}
