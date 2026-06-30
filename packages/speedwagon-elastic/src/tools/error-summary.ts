import { z } from "zod";
import { esPost } from "../client.js";

export const errorSummarySchema = z.object({
  index: z.string().describe("Index pattern (e.g. 'logs-*', 'error-logs-*')"),
  from: z.string().optional().default("now-24h").describe("Start time (default: now-24h)"),
  to: z.string().optional().default("now").describe("End time (default: now)"),
  service: z.string().optional().describe("Filter by service name"),
  group_by: z.enum(["message", "uri", "service", "status_code"]).optional().default("message")
    .describe("Group errors by: message (default), uri, service, or status_code"),
  size: z.number().optional().default(20).describe("Number of top error groups (default: 20)"),
});

export type ErrorSummaryInput = z.infer<typeof errorSummarySchema>;

const GROUP_FIELD_MAP: Record<string, string[]> = {
  message: ["message.keyword", "error.message.keyword", "log.message.keyword"],
  uri: ["url.path.keyword", "http.request.uri.keyword", "uri.keyword", "path.keyword"],
  service: ["service.name.keyword", "kubernetes.container.name.keyword", "app.name.keyword"],
  status_code: ["http.response.status_code", "response.status", "statusCode"],
};

export async function errorSummary(input: ErrorSummaryInput): Promise<string> {
  const must: unknown[] = [
    {
      range: {
        "@timestamp": {
          gte: input.from,
          lte: input.to,
        },
      },
    },
    {
      bool: {
        should: [
          { term: { "log.level": "error" } },
          { term: { level: "error" } },
          { term: { severity: "ERROR" } },
          { range: { "http.response.status_code": { gte: 500 } } },
          { range: { statusCode: { gte: 500 } } },
        ],
        minimum_should_match: 1,
      },
    },
  ];

  if (input.service) {
    must.push({
      bool: {
        should: [
          { term: { "service.name": input.service } },
          { term: { "kubernetes.container.name": input.service } },
        ],
        minimum_should_match: 1,
      },
    });
  }

  // Try each possible field name for the group_by
  const groupFields = GROUP_FIELD_MAP[input.group_by] ?? [input.group_by];

  const aggs: Record<string, unknown> = {};
  for (const field of groupFields) {
    aggs[`by_${field.replace(/\./g, "_")}`] = {
      terms: {
        field,
        size: input.size ?? 20,
        order: { _count: "desc" },
      },
    };
  }

  // Also get error count over time (hourly buckets)
  aggs.over_time = {
    date_histogram: {
      field: "@timestamp",
      fixed_interval: "1h",
    },
  };

  const result = await esPost<{
    hits: { total: { value: number } };
    aggregations: Record<string, {
      buckets: Array<{ key: string | number; doc_count: number }>;
    }>;
  }>(`/${input.index}/_search`, {
    query: { bool: { must } },
    aggs,
    size: 0,
  });

  // Find the aggregation that actually returned results
  let topErrors: Array<{ key: string | number; count: number }> = [];
  let groupedBy: string = input.group_by;

  for (const [aggName, aggResult] of Object.entries(result.aggregations ?? {})) {
    if (aggName === "over_time") continue;
    if (aggResult.buckets?.length > 0) {
      topErrors = aggResult.buckets.map((b) => ({
        key: b.key,
        count: b.doc_count,
      }));
      groupedBy = aggName.replace(/^by_/, "").replace(/_/g, ".");
      break;
    }
  }

  const timeline = (result.aggregations?.over_time?.buckets ?? []).map(
    (b: { key: string | number; doc_count: number }) => ({
      time: new Date(b.key).toISOString(),
      count: b.doc_count,
    })
  );

  return JSON.stringify({
    timeRange: { from: input.from, to: input.to },
    totalErrors: result.hits.total.value,
    groupedBy,
    topErrors,
    timeline,
  }, null, 2);
}
