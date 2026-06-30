import { config } from "./config.js";

export async function esGet<T = unknown>(path: string): Promise<T> {
  const res = await fetch(`${config.elasticUrl}${path}`, {
    headers: {
      Authorization: `ApiKey ${config.apiKey}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Elasticsearch ${res.status}: ${body}`);
  }

  return res.json() as Promise<T>;
}

export async function esPost<T = unknown>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${config.elasticUrl}${path}`, {
    method: "POST",
    headers: {
      Authorization: `ApiKey ${config.apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Elasticsearch ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}
