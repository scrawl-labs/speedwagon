import { z } from "zod";
import { getDb } from "../client.js";
import { getDefaultEnv } from "../config.js";

export const currentOpsSchema = z.object({
  env: z.string().optional().describe(`Target environment. Defaults to "${getDefaultEnv()}".`),
  min_secs: z.number().optional().default(0).describe("Only show operations running longer than this (seconds, default: 0 = all)"),
  namespace: z.string().optional().describe("Filter by namespace (e.g. 'mydb.users')"),
  op_type: z.string().optional().describe("Filter by operation type: query, insert, update, remove, command, getmore"),
});

export type CurrentOpsInput = z.infer<typeof currentOpsSchema>;

export async function currentOps(input: CurrentOpsInput): Promise<string> {
  const { db } = await getDb(input.env);
  const adminDb = db.admin();

  const filter: Record<string, unknown> = {
    active: true,
  };

  if (input.min_secs && input.min_secs > 0) {
    filter.secs_running = { $gte: input.min_secs };
  }
  if (input.namespace) {
    filter.ns = { $regex: input.namespace };
  }
  if (input.op_type) {
    filter.op = input.op_type;
  }

  const result = await adminDb.command({
    currentOp: 1,
    ...filter,
  });

  const ops = (result.inprog ?? []).map((op: Record<string, unknown>) => ({
    opid: op.opid,
    op: op.op,
    ns: op.ns,
    secs_running: op.secs_running ?? 0,
    microsecs_running: op.microsecs_running,
    command: op.command,
    planSummary: op.planSummary,
    client: op.client,
    appName: op.appName,
    waitingForLock: op.waitingForLock ?? false,
    numYields: op.numYields,
  }));

  // Sort by duration descending
  ops.sort((a: { secs_running: number }, b: { secs_running: number }) => b.secs_running - a.secs_running);

  return JSON.stringify({
    environment: input.env || getDefaultEnv(),
    totalOps: ops.length,
    operations: ops,
  }, null, 2);
}
