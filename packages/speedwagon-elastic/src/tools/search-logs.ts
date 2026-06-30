import { z } from "zod";
import { esPost } from "../client.js";

export const searchLogsSchema = z.object({
  index: z.string().describe("Index pattern (e.g. 'logs-*', 'filebeat-*', 'error-logs-*')"),
  query: z.string().optional().describe("Free-text search query (Lucene syntax, e.g. 'error AND timeout')"),
  level: z.string().optional().describe("Log level filter (e.g. 'error', 'warn', 'info')"),
  user: z.string().optional().describe("Filter by user/userId field"),
  uri: z.string().optional().describe("Filter by request URI or path"),
  service: z.string().optional().describe("Filter by service name"),
  from: z.string().optional().default("now-1h").describe("Start time (default: now-1h)"),
  to: z.string().optional().default("now").describe("End time (default: now)"),
  size: z.number().optional().default(50).describe("Number of log entries to return (default: 50, max: 200)"),
});

export type SearchLogsInput = z.infer<typeof searchLogsSchema>;

export async function searchLogs(input: SearchLogsInput): Promise<string> {
  const must: unknown[] = [
    {
      range: {
        "@timestamp": {
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
    must.push({
      bool: {
        should: [
          { term: { "log.level": input.level.toLowerCase() } },
          { term: { level: input.level.toLowerCase() } },
          { term: { severity: input.level.toUpperCase() } },
        ],
        minimum_should_match: 1,
      },
    });
  }

  if (input.user) {
    must.push({
      bool: {
        should: [
          { match: { "user.id": input.user } },
          { match: { userId: input.user } },
          { match: { "user.name": input.user } },
          { match: { username: input.user } },
        ],
        minimum_should_match: 1,
      },
    });
  }

  if (input.uri) {
    must.push({
      bool: {
        should: [
          { wildcard: { "url.path": `*${input.uri}*` } },
          { wildcard: { "http.request.uri": `*${input.uri}*` } },
          { wildcard: { uri: `*${input.uri}*` } },
          { wildcard: { path: `*${input.uri}*` } },
        ],
        minimum_should_match: 1,
      },
    });
  }

  if (input.service) {
    must.push({
      bool: {
        should: [
          { term: { "service.name": input.service } },
          { term: { "kubernetes.container.name": input.service } },
          { term: { "app.name": input.service } },
        ],
        minimum_should_match: 1,
      },
    });
  }

  const size = Math.min(input.size ?? 50, 200);

  const result = await esPost<{
    hits: {
      total: { value: number };
      hits: Array<{ _index: string; _source: Record<string, unknown> }>;
    };
  }>(`/${input.index}/_search`, {
    query: { bool: { must } },
    sort: [{ "@timestamp": "desc" }],
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
    logs: hits,
  }, null, 2);
}
