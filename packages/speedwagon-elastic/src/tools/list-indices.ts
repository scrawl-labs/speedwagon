import { z } from "zod";
import { esGet } from "../client.js";

export const listIndicesSchema = z.object({
  pattern: z.string().optional().default("*").describe("Index pattern to filter (e.g. 'logs-*', 'error-*'). Default: all."),
});

export type ListIndicesInput = z.infer<typeof listIndicesSchema>;

interface CatIndex {
  index: string;
  health: string;
  status: string;
  "docs.count": string;
  "store.size": string;
}

export async function listIndices(input: ListIndicesInput): Promise<string> {
  const indices = await esGet<CatIndex[]>(
    `/_cat/indices/${input.pattern}?format=json&h=index,health,status,docs.count,store.size&s=index`
  );

  // Filter out system indices
  const filtered = indices.filter((idx) => !idx.index.startsWith("."));

  return JSON.stringify({
    count: filtered.length,
    indices: filtered.map((idx) => ({
      index: idx.index,
      health: idx.health,
      status: idx.status,
      docCount: idx["docs.count"],
      size: idx["store.size"],
    })),
  }, null, 2);
}
