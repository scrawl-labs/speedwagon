import { z } from "zod";
import { grafanaGet } from "../client.js";

export const searchDashboardsSchema = z.object({
  query: z.string().optional().describe("Search query (matches dashboard title, folder name)"),
  tag: z.string().optional().describe("Filter by tag"),
  limit: z.number().optional().default(20).describe("Max results (default: 20)"),
});

export type SearchDashboardsInput = z.infer<typeof searchDashboardsSchema>;

interface DashboardHit {
  uid: string;
  title: string;
  type: string;
  url: string;
  tags: string[];
  folderTitle?: string;
}

export async function searchDashboards(input: SearchDashboardsInput): Promise<string> {
  const params: Record<string, string> = {
    type: "dash-db",
    limit: String(input.limit ?? 20),
  };
  if (input.query) params.query = input.query;
  if (input.tag) params.tag = input.tag;

  const hits = await grafanaGet<DashboardHit[]>("/api/search", params);

  return JSON.stringify({
    count: hits.length,
    dashboards: hits.map((h) => ({
      uid: h.uid,
      title: h.title,
      folder: h.folderTitle ?? null,
      tags: h.tags,
      url: h.url,
    })),
  }, null, 2);
}
