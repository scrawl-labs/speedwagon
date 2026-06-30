import { z } from "zod";
import { grafanaGet } from "../client.js";

export const getDashboardSchema = z.object({
  uid: z.string().describe("Dashboard UID"),
});

export type GetDashboardInput = z.infer<typeof getDashboardSchema>;

interface Panel {
  id: number;
  title: string;
  type: string;
  datasource?: { type?: string; uid?: string } | null;
  targets?: Array<{ expr?: string; refId?: string }>;
}

interface DashboardResponse {
  dashboard: {
    uid: string;
    title: string;
    tags: string[];
    panels: Panel[];
    time?: { from: string; to: string };
  };
  meta: {
    folderTitle?: string;
    url: string;
  };
}

export async function getDashboard(input: GetDashboardInput): Promise<string> {
  const data = await grafanaGet<DashboardResponse>(`/api/dashboards/uid/${input.uid}`);
  const { dashboard, meta } = data;

  const panels = (dashboard.panels ?? []).map((p) => ({
    id: p.id,
    title: p.title,
    type: p.type,
    datasource: p.datasource?.type ?? null,
  }));

  return JSON.stringify({
    uid: dashboard.uid,
    title: dashboard.title,
    folder: meta.folderTitle ?? null,
    tags: dashboard.tags,
    url: meta.url,
    timeRange: dashboard.time ?? null,
    panels,
  }, null, 2);
}
