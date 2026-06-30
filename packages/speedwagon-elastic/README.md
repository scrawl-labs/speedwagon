# @scrawl-labs/speedwagon-elastic

Elasticsearch MCP server — log search, error aggregation, and index discovery via Elasticsearch REST API. Read-only.

## Install

```bash
npm install -g @scrawl-labs/speedwagon-elastic
```

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ELASTICSEARCH_URL` | Yes | Elasticsearch endpoint (e.g. `https://es.example.com:9200`) |
| `ELASTICSEARCH_API_KEY` | Yes | API key for authentication |

### API Key Setup

Create a read-only API key:

```json
POST /_security/api_key
{
  "name": "speedwagon-readonly",
  "role_descriptors": {
    "readonly": {
      "indices": [
        {
          "names": ["logs-*", "error-*", "filebeat-*"],
          "privileges": ["read"]
        }
      ]
    }
  }
}
```

### MCP Client Configuration

Add to `~/.mcp.json` or project-level `.mcp.json`:

```json
{
  "mcpServers": {
    "speedwagon-elastic": {
      "command": "speedwagon-elastic",
      "env": {
        "ELASTICSEARCH_URL": "https://es.example.com:9200",
        "ELASTICSEARCH_API_KEY": "your-api-key"
      }
    }
  }
}
```

## Tools

### Index Discovery

| Tool | Description |
|------|-------------|
| `list_indices` | List indices with doc count and size. Filters system indices. |

### Log Search

| Tool | Description |
|------|-------------|
| `search_logs` | Search logs by free-text query, log level, user, URI, service, and time range |

Filter fields are flexible — the tool checks multiple common field names:
- **level**: `log.level`, `level`, `severity`
- **user**: `user.id`, `userId`, `user.name`, `username`
- **uri**: `url.path`, `http.request.uri`, `uri`, `path`
- **service**: `service.name`, `kubernetes.container.name`, `app.name`

### Error Analysis

| Tool | Description |
|------|-------------|
| `error_summary` | Top error groups with counts + hourly trend. Group by message, URI, service, or status code. |

## Usage Examples

```
"어떤 인덱스가 있어?"              → list_indices
"최근 1시간 에러 로그 보여줘"       → search_logs (level: "error")
"이 유저 에러 확인해줘"            → search_logs (user: "user123", level: "error")
"/api/payments 500 에러 봐줘"     → search_logs (uri: "/api/payments", level: "error")
"오늘 에러 요약해줘"              → error_summary (from: "now-24h")
"서비스별 에러 현황"              → error_summary (group_by: "service")
```

## License

MIT — Copyright (c) 2026 Yongtaek Lee.
