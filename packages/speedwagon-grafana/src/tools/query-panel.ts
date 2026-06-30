import { z } from "zod";
import { grafanaGet, grafanaPost } from "../client.js";

export const queryPanelSchema = z.object({
  uid: z.string().describe("Dashboard UID"),
  panelId: z.number().describe("Panel ID (from get_dashboard result)"),
  from: z.string().optional().describe("Start time (e.g. 'now-1h', '2026-06-30T00:00:00Z'). Defaults to dashboard's time range."),
  to: z.string().optional().describe("End time (e.g. 'now', '2026-06-30T12:00:00Z'). Defaults to dashboard's time range."),
});

export type QueryPanelInput = z.infer<typeof queryPanelSchema>;

interface Panel {
  id: number;
  title: string;
  type: string;
  datasource?: { type?: string; uid?: string } | null;
  targets?: Array<Record<string, unknown>>;
}

interface DashboardResponse {
  dashboard: {
    uid: string;
    title: string;
    panels: Panel[];
    time?: { from: string; to: string };
  };
}

export async function queryPanel(input: QueryPanelInput): Promise<string> {
  const data = await grafanaGet<DashboardResponse>(`/api/dashboards/uid/${input.uid}`);
  const panel = data.dashboard.panels.find((p) => p.id === input.panelId);

  if (!panel) {
    const ids = data.dashboard.panels.map((p) => `${p.id}: ${p.title}`).join(", ");
    throw new Error(`Panel ${input.panelId} not found. Available: ${ids}`);
  }

  if (!panel.targets?.length) {
    throw new Error(`Panel "${panel.title}" has no query targets.`);
  }

  if (!panel.datasource?.uid) {
    throw new Error(`Panel "${panel.title}" has no datasource configured.`);
  }

  const timeRange = {
    from: input.from ?? data.dashboard.time?.from ?? "now-1h",
    to: input.to ?? data.dashboard.time?.to ?? "now",
  };

  const queries = panel.targets.map((target, i) => ({
    ...target,
    refId: target.refId ?? String.fromCharCode(65 + i),
    datasource: panel.datasource,
  }));

  const result = await grafanaPost("/api/ds/query", {
    queries,
    from: timeRange.from,
    to: timeRange.to,
  });

  return JSON.stringify({
    panel: { id: panel.id, title: panel.title, type: panel.type },
    timeRange,
    result,
  }, null, 2);
}
