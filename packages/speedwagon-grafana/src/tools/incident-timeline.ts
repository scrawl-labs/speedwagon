import { z } from "zod";
import { grafanaGet } from "../client.js";

export const incidentTimelineSchema = z.object({
  from: z.string().optional().default("now-6h").describe("Start time (default: now-6h)"),
  to: z.string().optional().default("now").describe("End time (default: now)"),
  dashboardUid: z.string().optional().describe("Filter by dashboard UID (optional)"),
});

export type IncidentTimelineInput = z.infer<typeof incidentTimelineSchema>;

interface Annotation {
  id: number;
  dashboardUID: string;
  panelId: number;
  time: number;
  timeEnd: number;
  text: string;
  tags: string[];
  alertName?: string;
  newState?: string;
  prevState?: string;
}

interface AlertRule {
  uid: string;
  title: string;
  condition: string;
  labels: Record<string, string>;
  annotations?: Record<string, string>;
}

interface AlertInstance {
  labels: Record<string, string>;
  state: string;
  activeAt?: string;
  value?: string;
}

interface AlertRuleGroup {
  rules: Array<{
    name: string;
    state: string;
    alerts?: AlertInstance[];
    labels?: Record<string, string>;
    annotations?: Record<string, string>;
  }>;
  name: string;
  folder: string;
}

interface TimelineEvent {
  time: string;
  type: "alert_state_change" | "annotation" | "active_alert";
  severity: "critical" | "warning" | "info" | "resolved";
  title: string;
  detail: string | null;
  dashboard: string | null;
  tags: string[];
}

function resolveTime(input: string): number {
  if (/^\d+$/.test(input)) return parseInt(input, 10);

  const match = input.match(/^now-(\d+)([smhdwM])$/);
  if (match) {
    const value = parseInt(match[1], 10);
    const unit: Record<string, number> = {
      s: 1000,
      m: 60_000,
      h: 3_600_000,
      d: 86_400_000,
      w: 604_800_000,
      M: 2_592_000_000,
    };
    return Date.now() - value * (unit[match[2]] ?? 0);
  }

  if (input === "now") return Date.now();

  const parsed = Date.parse(input);
  if (!isNaN(parsed)) return parsed;

  return Date.now();
}

function alertSeverity(state: string): TimelineEvent["severity"] {
  switch (state.toLowerCase()) {
    case "alerting":
    case "firing":
      return "critical";
    case "pending":
      return "warning";
    case "normal":
    case "ok":
    case "resolved":
      return "resolved";
    default:
      return "info";
  }
}

export async function incidentTimeline(input: IncidentTimelineInput): Promise<string> {
  const fromMs = resolveTime(input.from);
  const toMs = resolveTime(input.to);
  const events: TimelineEvent[] = [];

  // 1. Fetch annotations (includes alert state change history)
  const annotationParams: Record<string, string> = {
    from: String(fromMs),
    to: String(toMs),
    limit: "200",
    type: "alert",
  };
  if (input.dashboardUid) {
    annotationParams.dashboardUID = input.dashboardUid;
  }

  try {
    const annotations = await grafanaGet<Annotation[]>("/api/annotations", annotationParams);
    for (const ann of annotations) {
      events.push({
        time: new Date(ann.time).toISOString(),
        type: "alert_state_change",
        severity: ann.newState ? alertSeverity(ann.newState) : "info",
        title: ann.alertName ?? ann.text ?? "Alert state change",
        detail: ann.prevState && ann.newState
          ? `${ann.prevState} → ${ann.newState}`
          : ann.text || null,
        dashboard: ann.dashboardUID || null,
        tags: ann.tags ?? [],
      });
    }
  } catch {
    // annotations API might not be available, continue
  }

  // 2. Fetch currently active alerts
  try {
    const ruleGroups = await grafanaGet<Record<string, AlertRuleGroup[]>>("/api/prometheus/grafana/api/v1/rules");
    const groups = Object.values(ruleGroups).flat();

    for (const group of groups) {
      if (!group.rules) continue;
      for (const rule of group.rules) {
        if (!rule.alerts) continue;
        for (const alert of rule.alerts) {
          if (alert.state === "normal" || alert.state === "inactive") continue;

          const activeAt = alert.activeAt ? new Date(alert.activeAt).getTime() : 0;
          if (activeAt < fromMs || activeAt > toMs) continue;

          events.push({
            time: alert.activeAt ?? new Date().toISOString(),
            type: "active_alert",
            severity: alertSeverity(alert.state),
            title: rule.name,
            detail: alert.value ?? null,
            dashboard: null,
            tags: Object.entries(alert.labels ?? {}).map(([k, v]) => `${k}=${v}`),
          });
        }
      }
    }
  } catch {
    // alert rules API might need different permissions, continue
  }

  // 3. Also fetch general annotations (non-alert)
  try {
    const generalParams: Record<string, string> = {
      from: String(fromMs),
      to: String(toMs),
      limit: "100",
      type: "annotation",
    };
    if (input.dashboardUid) {
      generalParams.dashboardUID = input.dashboardUid;
    }

    const annotations = await grafanaGet<Annotation[]>("/api/annotations", generalParams);
    for (const ann of annotations) {
      events.push({
        time: new Date(ann.time).toISOString(),
        type: "annotation",
        severity: "info",
        title: ann.text || "Annotation",
        detail: null,
        dashboard: ann.dashboardUID || null,
        tags: ann.tags ?? [],
      });
    }
  } catch {
    // continue
  }

  // Sort chronologically
  events.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  const summary = {
    critical: events.filter((e) => e.severity === "critical").length,
    warning: events.filter((e) => e.severity === "warning").length,
    resolved: events.filter((e) => e.severity === "resolved").length,
    info: events.filter((e) => e.severity === "info").length,
  };

  return JSON.stringify({
    timeRange: { from: input.from, to: input.to },
    totalEvents: events.length,
    summary,
    timeline: events,
  }, null, 2);
}
