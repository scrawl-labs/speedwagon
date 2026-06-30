import { config } from "./config.js";

export async function grafanaGet<T = unknown>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(path, config.grafanaUrl);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Grafana API ${res.status}: ${body}`);
  }

  return res.json() as Promise<T>;
}

export async function grafanaPost<T = unknown>(path: string, body: unknown): Promise<T> {
  const url = new URL(path, config.grafanaUrl);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Grafana API ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}
