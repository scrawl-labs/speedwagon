import { z } from "zod";
import { esPost } from "../client.js";
import { config } from "../config.js";

export const errorSummarySchema = z.object({
  index: z.string().describe("Index pattern (e.g. 'logs-*', 'kubernetes-logs-*')"),
  from: z.string().optional().default("now-24h").describe("Start time (default: now-24h)"),
  to: z.string().optional().default("now").describe("End time (default: now)"),
  service: z.string().optional().describe("Filter by service name"),
  group_by: z.enum(["message", "uri", "service", "status_code"]).optional().default("message")
    .describe("Group errors by: message (default), uri, service, or status_code"),
  size: z.number().optional().default(20).describe("Number of top error groups (default: 20)"),
});

export type ErrorSummaryInput = z.infer<typeof errorSummarySchema>;

function getGroupField(groupBy: string): string {
  const f = config.fieldMap;
  const map: Record<string, string> = {
    message: `${f.message}.keyword`,
    uri: `${f.uri}.keyword`,
    service: `${f.service}.keyword`,
    status_code: f.status_code,
  };
  return map[groupBy] ?? `${groupBy}.keyword`;
}

export async function errorSummary(input: ErrorSummaryInput): Promise<string> {
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
    {
      bool: {
        should: [
          { term: { [f.level]: "error" } },
          { range: { [f.status_code]: { gte: 500 } } },
        ],
        minimum_should_match: 1,
      },
    },
  ];

  if (input.service) {
    must.push({ term: { [f.service]: input.service } });
  }

  const groupField = getGroupField(input.group_by);

  const aggs: Record<string, unknown> = {
    top_groups: {
      terms: {
        field: groupField,
        size: input.size ?? 20,
        order: { _count: "desc" },
      },
    },
    over_time: {
      date_histogram: {
        field: f.timestamp,
        fixed_interval: "1h",
      },
    },
  };

  const result = await esPost<{
    hits: { total: { value: number } };
    aggregations: {
      top_groups: {
        buckets: Array<{ key: string | number; doc_count: number }>;
      };
      over_time: {
        buckets: Array<{ key: string | number; doc_count: number }>;
      };
    };
  }>(`/${input.index}/_search`, {
    query: { bool: { must } },
    aggs,
    size: 0,
  });

  const topErrors = (result.aggregations?.top_groups?.buckets ?? []).map((b) => ({
    key: b.key,
    count: b.doc_count,
  }));

  const timeline = (result.aggregations?.over_time?.buckets ?? []).map((b) => ({
    time: new Date(b.key).toISOString(),
    count: b.doc_count,
  }));

  return JSON.stringify({
    timeRange: { from: input.from, to: input.to },
    totalErrors: result.hits.total.value,
    groupedBy: groupField,
    topErrors,
    timeline,
  }, null, 2);
}
