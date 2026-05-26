# @scrawl-labs/speedwagon-elastic

Elastic MCP server in the Speedwagon family. It's a **gateway** in front of the [Kibana Agent Builder MCP server](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/mcp-server) (`{KIBANA_URL}/api/agent_builder/mcp`). Speedwagon connects over HTTP with your API key and re-exposes the Agent Builder tools — which cover APM and log data living in your Elasticsearch indices.

Read-only access is enforced by the API key: it must carry the `feature_agentBuilder.read` privilege and nothing more.

## Install

```bash
npm install -g @scrawl-labs/speedwagon-elastic
```

Add to your MCP client config (e.g. `~/.claude/settings.json`):

```json
{
  "mcpServers": {
    "speedwagon-elastic": {
      "command": "speedwagon-elastic",
      "env": {
        "KIBANA_URL": "https://your-deployment.kb.cloud.es.io",
        "ELASTIC_API_KEY": "base64_api_key"
      }
    }
  }
}
```

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `KIBANA_URL` | Yes | Base URL of your Kibana instance |
| `ELASTIC_API_KEY` | Yes | API key with `feature_agentBuilder.read` |
| `KIBANA_SPACE` | No | Target a non-default Kibana space |

## Exposed tools

Whatever your Kibana Agent Builder exposes is passed through (built-in ES|QL / index search tools reach APM `traces-apm*` and `logs-*` data streams). Configure which tools exist in Kibana's Agent Builder settings.

## License

MIT — Copyright (c) 2026 Yongtaek Lee.
