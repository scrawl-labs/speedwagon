import { z } from "zod";
import { getDb } from "../client.js";
import { getDefaultEnv } from "../config.js";

export const serverStatusSchema = z.object({
  env: z.string().optional().describe(`Target environment. Defaults to "${getDefaultEnv()}".`),
});

export type ServerStatusInput = z.infer<typeof serverStatusSchema>;

export async function serverStatus(input: ServerStatusInput): Promise<string> {
  const { db } = await getDb(input.env);
  const adminDb = db.admin();

  const status = await adminDb.command({ serverStatus: 1 });

  const summary = {
    host: status.host,
    version: status.version,
    uptime: {
      seconds: status.uptime,
      hours: Math.round((status.uptime / 3600) * 10) / 10,
    },
    connections: {
      current: status.connections?.current,
      available: status.connections?.available,
      totalCreated: status.connections?.totalCreated,
    },
    opcounters: status.opcounters,
    memory: {
      resident_mb: status.mem?.resident,
      virtual_mb: status.mem?.virtual,
      mapped_mb: status.mem?.mapped,
    },
    network: {
      bytesIn: status.network?.bytesIn,
      bytesOut: status.network?.bytesOut,
      numRequests: status.network?.numRequests,
    },
    globalLock: {
      currentQueue: status.globalLock?.currentQueue,
      activeClients: status.globalLock?.activeClients,
    },
  };

  return JSON.stringify({
    environment: input.env || getDefaultEnv(),
    ...summary,
  }, null, 2);
}
