import { z } from "zod";
import { getDb } from "../client.js";

export const slowQueriesSchema = z.object({
  threshold_ms: z.number().optional().default(100).describe("Slow query threshold in milliseconds (default: 100ms)"),
  limit: z.number().optional().default(20).describe("Maximum number of queries to return (default: 20)"),
  collection_filter: z.string().optional().describe("Filter by specific collection name"),
});

export type SlowQueriesInput = z.infer<typeof slowQueriesSchema>;

export async function slowQueries(input: SlowQueriesInput): Promise<string> {
  const { db } = await getDb();

  const filter: Record<string, unknown> = {
    millis: { $gte: input.threshold_ms },
  };

  if (input.collection_filter) {
    filter["ns"] = { $regex: `\\.${input.collection_filter}$` };
  }

  try {
    const results = await db
      .collection("system.profile")
      .find(filter)
      .sort({ millis: -1 })
      .limit(input.limit ?? 20)
      .toArray();

    if (results.length === 0) {
      const profilingLevel = await db.command({ profile: -1 });
      return JSON.stringify({
        message: "No slow queries found.",
        hint:
          profilingLevel.was === 0
            ? "Profiler is disabled. Enable it: db.setProfilingLevel(1, { slowms: 100 })"
            : "No queries slower than the current threshold.",
        currentProfilingLevel: profilingLevel,
      }, null, 2);
    }

    const formatted = results.map((r) => ({
      ns: r.ns,
      op: r.op,
      millis: r.millis,
      query: r.command ?? r.query,
      planSummary: r.planSummary,
      docsExamined: r.docsExamined,
      keysExamined: r.keysExamined,
      nreturned: r.nreturned,
      ts: r.ts,
    }));

    return JSON.stringify(formatted, null, 2);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("not found") || msg.includes("system.profile")) {
      return JSON.stringify({
        error: "system.profile collection does not exist.",
        hint: "Enable the profiler: db.setProfilingLevel(1, { slowms: 100 })",
      }, null, 2);
    }
    throw error;
  }
}
