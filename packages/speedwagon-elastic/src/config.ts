import { requiredEnv, optionalEnv } from "@scrawl-labs/speedwagon";

export interface FieldMap {
  timestamp: string;
  level: string;
  message: string;
  uri: string;
  method: string;
  status_code: string;
  user: string;
  service: string;
  user_agent: string;
}

const DEFAULT_FIELD_MAP: FieldMap = {
  timestamp: "@timestamp",
  level: "log.level",
  message: "message",
  uri: "url.path",
  method: "http.request.method",
  status_code: "http.response.status_code",
  user: "user.id",
  service: "service.name",
  user_agent: "user_agent.original",
};

function parseFieldMap(raw: string | undefined): FieldMap {
  if (!raw) return DEFAULT_FIELD_MAP;
  try {
    const parsed = JSON.parse(raw) as Partial<FieldMap>;
    return { ...DEFAULT_FIELD_MAP, ...parsed };
  } catch {
    throw new Error(
      `ELASTICSEARCH_FIELD_MAP is not valid JSON. Example: ${JSON.stringify(DEFAULT_FIELD_MAP)}`
    );
  }
}

export const config = {
  elasticUrl: requiredEnv("ELASTICSEARCH_URL").replace(/\/+$/, ""),
  apiKey: requiredEnv("ELASTICSEARCH_API_KEY"),
  fieldMap: parseFieldMap(optionalEnv("ELASTICSEARCH_FIELD_MAP")),
} as const;
