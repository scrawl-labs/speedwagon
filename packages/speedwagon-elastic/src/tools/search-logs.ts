import { z } from "zod";
import { esPost } from "../client.js";
import { config } from "../config.js";

export const searchLogsSchema = z.object({
  index: z.string().describe("Index pattern (e.g. 'logs-*', 'filebeat-*', 'kubernetes-logs-*')"),
  query: z.string().optional().describe("Free-text search query (Lucene syntax, e.g. 'error AND timeout')"),
  level: z.string().optional().describe("Log level filter (e.g. 'error', 'warn', 'info', 'access')"),
  user: z.string().optional().describe("Filter by user identifier"),
  uri: z.string().optional().describe("Filter by request URI or path"),
  service: z.string().optional().describe("Filter by service/app name"),
  status_code: z.number().optional().describe("Filter by HTTP status code (e.g. 500)"),
  method: z.string().optional().describe("Filter by HTTP method (e.g. GET, POST)"),
  from: z.string().optional().default("now-1h").describe("Start time (default: now-1h)"),
  to: z.string().optional().default("now").describe("End time (default: now)"),
  size: z.number().optional().default(50).describe("Number of log entries to return (default: 50, max: 200)"),
});

export type SearchLogsInput = z.infer<typeof searchLogsSchema>;

export async function searchLogs(input: SearchLogsInput): Promise<string> {
  const f = config.fieldMap;

  const must: unknown[] = [
    {
      range: {
        [f.timestamp]: {
          gte: input.from,
          lte: input.to,
        },
      },
    },
  ];

  if (input.query) {
    must.push({ query_string: { query: input.query } });
  }

  if (input.level) {
    must.push({ term: { [f.level]: input.level.toLowerCase() } });
  }

  if (input.user) {
    must.push({ match: { [f.user]: input.user } });
  }

  if (input.uri) {
    must.push({ wildcard: { [f.uri]: `*${input.uri}*` } });
  }

  if (input.service) {
    must.push({ term: { [f.service]: input.service } });
  }

  if (input.status_code) {
    must.push({ term: { [f.status_code]: input.status_code } });
  }

  if (input.method) {
    must.push({ term: { [f.method]: input.method.toUpperCase() } });
  }

  const size = Math.min(input.size ?? 50, 200);

  const result = await esPost<{
    hits: {
      total: { value: number };
      hits: Array<{ _index: string; _source: Record<string, unknown> }>;
    };
  }>(`/${input.index}/_search`, {
    query: { bool: { must } },
    sort: [{ [f.timestamp]: "desc" }],
    size,
    _source: true,
  });

  const hits = result.hits.hits.map((h) => ({
    index: h._index,
    ...h._source,
  }));

  return JSON.stringify({
    total: result.hits.total.value,
    returned: hits.length,
    fieldMap: f,
    logs: hits,
  }, null, 2);
}
